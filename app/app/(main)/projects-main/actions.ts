"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

const TASK_FIELDS = new Set(["name", "status_id", "result", "notes"]);
const PROJECT_FIELDS = new Set([
  "name",
  "tickle_date",
  "notes",
  "status_id",
  "uber_project_id",
]);
const UBER_FIELDS = new Set(["name"]);

export async function updateTaskField(
  id: string,
  field: string,
  value: unknown
) {
  if (!TASK_FIELDS.has(field)) throw new Error(`Invalid task field: ${field}`);
  await poolV002.query(`UPDATE tasks SET ${field} = $1 WHERE id = $2`, [
    value,
    id,
  ]);
  revalidatePath("/projects-main");
}

export async function updateProjectField(
  id: string,
  field: string,
  value: unknown
) {
  if (!PROJECT_FIELDS.has(field))
    throw new Error(`Invalid project field: ${field}`);
  await poolV002.query(`UPDATE projects SET ${field} = $1 WHERE id = $2`, [
    value,
    id,
  ]);
  revalidatePath("/projects-main");
}

export async function updateUberField(
  id: string,
  field: string,
  value: unknown
) {
  if (!UBER_FIELDS.has(field)) throw new Error(`Invalid uber field: ${field}`);
  await poolV002.query(
    `UPDATE uber_projects SET ${field} = $1 WHERE id = $2`,
    [value, id]
  );
  revalidatePath("/projects-main");
}

export async function finalizeProject(id: string) {
  await poolV002.query(
    `UPDATE projects SET is_draft = false WHERE id = $1`,
    [id]
  );
  revalidatePath("/projects-main");
}

export async function deleteTask(id: string) {
  await poolV002.query(
    `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  revalidatePath("/projects-main");
}

export async function createTask(projectId: string) {
  const status = await poolV002.query(
    `SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`
  );
  if (!status.rows[0]) throw new Error("Tickled task status missing");
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ($1, $2, $3)`,
    ["", projectId, status.rows[0].id]
  );
  revalidatePath("/projects-main");
}

export async function createProject() {
  const [projectStatus, taskStatus, uberProject] = await Promise.all([
    poolV002.query(`SELECT id FROM project_statuses WHERE name = 'Active' LIMIT 1`),
    poolV002.query(`SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`),
    poolV002.query(`SELECT id FROM uber_projects ORDER BY name LIMIT 1`),
  ]);
  if (!projectStatus.rows[0]) throw new Error("Active project status missing");
  if (!taskStatus.rows[0]) throw new Error("Tickled task status missing");
  if (!uberProject.rows[0]) throw new Error("No uber projects available");

  const project = await poolV002.query(
    `INSERT INTO projects (name, status_id, uber_project_id, is_draft)
     VALUES ('Untitled Project', $1, $2, true)
     RETURNING id`,
    [projectStatus.rows[0].id, uberProject.rows[0].id],
  );
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ('', $1, $2)`,
    [project.rows[0].id, taskStatus.rows[0].id],
  );
  revalidatePath("/projects-main");
}
