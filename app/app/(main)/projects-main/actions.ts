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
