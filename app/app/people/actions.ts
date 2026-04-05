"use server";

import { revalidatePath } from "next/cache";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const TABLE_ID = "tblyvrNXdqftQGNIniT";

const FIELD_IDS: Record<string, string> = {
  name: "fldSPVtMzXTa6fENhat",
  familiarity: "fldH5ozoEn1Kg4Nipvd",
  gender: "fldRuJWVkFxHg7ucuMU",
  knownAs: "fldrvcZnhTn4QWZ6bNi",
  metroArea: "flduOaiuIi8btT9sANI",
  hasOrgFilled: "fldlebuohufqa0fwkD7",
  targetDesirability: "fldFgI9S4GmUkC0lCuc",
  tellerStatus: "fldxYGQdd5YWbKJ16Jg",
};

export async function updatePersonField(
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
      records: [{ id: recordId, fields: { [fieldId]: value || null } }],
    }),
  });

  if (!res.ok) throw new Error(`Failed to update ${field}`);
  revalidatePath("/people");
}
