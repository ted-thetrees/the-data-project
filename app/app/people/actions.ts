"use server";

import { revalidatePath } from "next/cache";
import { pool, BR, F } from "@/lib/db";

const FIELD_MAP: Record<string, string> = {
  name: F.people_name,
  familiarity: F.people_familiarity,
  gender: F.people_gender,
  knownAs: F.people_known_as,
  metroArea: F.people_metro_area,
  hasOrgFilled: F.people_has_org_filled,
  tellerStatus: F.people_teller_status,
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
  revalidatePath("/people");
}
