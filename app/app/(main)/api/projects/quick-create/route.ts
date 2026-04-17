import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { poolV002 } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const [uberRows, projectStatusRow, taskStatusRow] = await Promise.all([
    poolV002.query<{ id: string; name: string }>(
      `SELECT id, name FROM uber_projects ORDER BY name`,
    ),
    poolV002.query(`SELECT id FROM project_statuses WHERE name = 'Active' LIMIT 1`),
    poolV002.query(`SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`),
  ]);
  if (!uberRows.rows.length) {
    return NextResponse.json({ error: "no uber projects" }, { status: 500 });
  }
  if (!projectStatusRow.rows[0] || !taskStatusRow.rows[0]) {
    return NextResponse.json(
      { error: "required statuses missing" },
      { status: 500 },
    );
  }

  const uberNames = uberRows.rows.map((r) => r.name);

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    tools: [
      {
        name: "create_project",
        description:
          "Create a Project from the user's sentence by extracting a concise title and the best-fitting uber project category.",
        input_schema: {
          type: "object",
          required: ["title", "uber_project"],
          properties: {
            title: {
              type: "string",
              description:
                "A short, imperative project title (typically 2–8 words). Strip filler like 'I want to' or 'remember to'. Capitalize naturally.",
            },
            uber_project: {
              type: "string",
              enum: uberNames,
              description: "Which uber project this belongs under.",
            },
          },
        },
      },
    ],
    tool_choice: { type: "tool", name: "create_project" },
    messages: [
      {
        role: "user",
        content: `Create a project from this sentence:\n\n${text}`,
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "model did not return tool_use" }, { status: 502 });
  }
  const parsed = toolUse.input as { title: string; uber_project: string };
  const uber = uberRows.rows.find((r) => r.name === parsed.uber_project) ?? uberRows.rows[0];

  const project = await poolV002.query<{ id: string }>(
    `INSERT INTO projects (name, status_id, uber_project_id, is_draft)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [parsed.title, projectStatusRow.rows[0].id, uber.id],
  );
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ('', $1, $2)`,
    [project.rows[0].id, taskStatusRow.rows[0].id],
  );

  return NextResponse.json({
    success: true,
    id: project.rows[0].id,
    title: parsed.title,
    uber_project: uber.name,
  });
}
