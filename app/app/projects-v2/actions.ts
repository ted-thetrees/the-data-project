"use server";

import { revalidatePath } from "next/cache";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const TABLE_ID = "tblvtt4qK8mtiWhz512";

const FIELD_IDS: Record<string, string> = {
  tickleDate: "fldOROoCmhf73IT107l",
  task: "fld12VKNDITfIODCrEA",
  taskStatus: "fldenzRVC15eV6S5q2r",
  taskResult: "fld8YTgDOZZA21l1sOb",
  taskNotes: "fldGslWW53tx0e776eK",
};

export async function updateTickleDate(taskIds: string[], date: string) {
  const records = taskIds.map((id) => ({
    id,
    fields: { [FIELD_IDS.tickleDate]: date },
  }));

  const res = await fetch(`${TEABLE_URL}/api/table/${TABLE_ID}/record`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TEABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fieldKeyType: "id", records }),
  });

  if (!res.ok) throw new Error("Failed to update tickle date");
  revalidatePath("/projects-v2");
}

export async function updateTaskField(
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
  revalidatePath("/projects-v2");
}
