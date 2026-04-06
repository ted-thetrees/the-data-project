"use server";

import { revalidatePath } from "next/cache";
import { pool, BR, F } from "@/lib/db";

const FIELD_MAP: Record<string, string> = {
  table_name: F.pc_table,
  field: F.pc_field,
  option: F.pc_option,
  color: F.pc_color,
};

export async function deletePicklistColor(recordId: string) {
  await pool.query(
    `UPDATE ${BR.Picklist_Colors} SET trashed = true WHERE id = $1`,
    [parseInt(recordId)]
  );
  revalidatePath("/picklist-colors");
}

export async function updatePicklistColor(
  recordId: string,
  field: string,
  value: string
) {
  const col = FIELD_MAP[field];
  if (!col) throw new Error(`Unknown field: ${field}`);

  await pool.query(
    `UPDATE ${BR.Picklist_Colors} SET ${col} = $1, updated_on = NOW() WHERE id = $2`,
    [value, parseInt(recordId)]
  );
  revalidatePath("/picklist-colors");
}
