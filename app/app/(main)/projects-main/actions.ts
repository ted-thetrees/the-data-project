"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

const TASK_FIELDS = new Set(["name", "status_id", "result", "notes"]);
const PROJECT_FIELDS = new Set(["name", "tickle_date", "notes", "status_id"]);
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

export async function createTask(projectId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const status = await poolV002.query(
    `SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`
  );
  if (!status.rows[0]) throw new Error("Tickled task status missing");
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ($1, $2, $3)`,
    [trimmed, projectId, status.rows[0].id]
  );
  revalidatePath("/projects-main");
}
