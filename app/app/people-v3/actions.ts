"use server";

import { revalidatePath } from "next/cache";
import { pool, BR, F } from "@/lib/db";

const FIELD_MAP: Record<string, string> = {
  name: F.people_name,
  familiarity: F.people_familiarity,
  gender: F.people_gender,
  known_as: F.people_known_as,
  metro_area: F.people_metro_area,
  has_org_filled: F.people_has_org_filled,
  teller_status: F.people_teller_status,
};

export async function updatePersonField(
  recordId: string,
  field: string,
  value: string
) {
  const col = FIELD_MAP[field];
  if (!col) throw new Error(`Unknown field: ${field}`);

  await pool.query(
    `UPDATE ${BR.People} SET ${col} = $1, updated_on = NOW() WHERE id = $2`,
    [value || null, parseInt(recordId)]
  );
  revalidatePath("/people-v3");
}

export async function createPerson(fields: Record<string, string>) {
  const cols: string[] = ['"order"', "created_on", "updated_on", "trashed"];
  const vals: (string | null | boolean | number | Date)[] = [1, new Date(), new Date(), false];

  for (const [key, value] of Object.entries(fields)) {
    const col = FIELD_MAP[key];
    if (col && value) {
      cols.push(col);
      vals.push(value);
    }
  }

  if (vals.length === 4) return; // no user fields

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  await pool.query(
    `INSERT INTO ${BR.People} (${cols.join(", ")}) VALUES (${placeholders})`,
    vals
  );
  revalidatePath("/people-v3");
}
