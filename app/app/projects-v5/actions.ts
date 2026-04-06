"use server";

import { revalidatePath } from "next/cache";
import { pool, BR, F } from "@/lib/db";

const FIELD_MAP: Record<string, string> = {
  tickleDate: F.pm_tickle_date,
  task: F.pm_task,
  taskStatus: F.pm_task_status,
  taskResult: F.pm_task_result,
  taskNotes: F.pm_task_notes,
};

export async function updateTickleDate(taskIds: string[], date: string) {
  const ids = taskIds.map((id) => parseInt(id));
  await pool.query(
    `UPDATE ${BR.Project_Matrix} SET ${F.pm_tickle_date} = $1, updated_on = NOW() WHERE id = ANY($2::int[])`,
    [date, ids]
  );
  revalidatePath("/projects-v5");
}

export async function updateTaskField(
  recordId: string,
  field: string,
  value: string
) {
  const col = FIELD_MAP[field];
  if (!col) throw new Error(`Unknown field: ${field}`);

  await pool.query(
    `UPDATE ${BR.Project_Matrix} SET ${col} = $1, updated_on = NOW() WHERE id = $2`,
    [value, parseInt(recordId)]
  );
  revalidatePath("/projects-v5");
}
