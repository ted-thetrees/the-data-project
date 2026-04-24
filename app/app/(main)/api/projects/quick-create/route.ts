import { NextRequest, NextResponse } from "next/server";
import { poolV002 } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { title, uber_project } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const [uberRows, projectStatusRow, taskStatusRow, actionOrderRow] =
    await Promise.all([
      poolV002.query<{ id: string; name: string }>(
        `SELECT id, name FROM uber_projects ORDER BY name`,
      ),
      poolV002.query(`SELECT id FROM project_statuses WHERE name = 'Active' LIMIT 1`),
      poolV002.query(`SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`),
      poolV002.query(
        `SELECT id FROM project_action_order_statuses WHERE name = 'Needs Sorting' LIMIT 1`,
      ),
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

  const uber =
    uberRows.rows.find((r) => r.name === uber_project) ?? uberRows.rows[0];

  const project = await poolV002.query<{ id: string }>(
    `INSERT INTO projects (name, status_id, uber_project_id, action_order_status_id, is_draft)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [title, projectStatusRow.rows[0].id, uber.id, actionOrderRow.rows[0]?.id ?? null],
  );
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ('', $1, $2)`,
    [project.rows[0].id, taskStatusRow.rows[0].id],
  );

  return NextResponse.json({
    success: true,
    id: project.rows[0].id,
    title,
    uber_project: uber.name,
  });
}
