"use server";

import { revalidatePath } from "next/cache";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const TABLE_ID = "tbl0oH7BL6QQmUd5vak";

const FIELD_IDS: Record<string, string> = {
  field: "fldKbYzY5s9EOcNFrnr",
  option: "fldC2zjZAbDxCwvbb1Q",
  color: "fldXyaQXtoskZEuaMsR",
};

export async function updatePicklistColor(
  recordId: string,
  field: string,
  value: string
) {
  const fieldId = FIELD_IDS[field];
  if (!fieldId) throw new Error(`Unknown field: ${field}`);

  const res = await fetch(`${TEABLE_URL}/api/table/${TABLE_ID}/record`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TEABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fieldKeyType: "id",
      records: [{ id: recordId, fields: { [fieldId]: value } }],
    }),
  });

  if (!res.ok) throw new Error(`Failed to update ${field}`);
  revalidatePath("/picklist-colors");
}
