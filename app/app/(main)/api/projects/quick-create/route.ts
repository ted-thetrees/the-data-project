import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { poolV002 } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { title, uber_project } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const [uberRows, taskStatusRow, priorityRow] = await Promise.all([
    poolV002.query<{ id: string; name: string }>(
      `SELECT id, name FROM uber_projects ORDER BY name`,
    ),
    poolV002.query(`SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`),
    poolV002.query(
      `SELECT id FROM project_priorities WHERE name = 'Needs Sorting' LIMIT 1`,
    ),
  ]);
  if (!uberRows.rows.length) {
    return NextResponse.json({ error: "no uber projects" }, { status: 500 });
  }
  if (!taskStatusRow.rows[0]) {
    return NextResponse.json(
      { error: "required statuses missing" },
      { status: 500 },
    );
  }

  const uber =
    uberRows.rows.find((r) => r.name === uber_project) ?? uberRows.rows[0];

  const project = await poolV002.query<{ id: string }>(
    `INSERT INTO projects (name, uber_project_id, priority_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [title, uber.id, priorityRow.rows[0]?.id ?? null],
  );
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ('', $1, $2)`,
    [project.rows[0].id, taskStatusRow.rows[0].id],
  );

  revalidateTag("projects-main", "max");

  return NextResponse.json({
    success: true,
    id: project.rows[0].id,
    title,
    uber_project: uber.name,
  });
}
