"use server";

import { revalidatePath } from "next/cache";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const TABLE_ID = "tblvtt4qK8mtiWhz512";
const TICKLE_DATE_FIELD = "fldOROoCmhf73IT107l";

export async function updateTickleDate(taskIds: string[], date: string) {
  const records = taskIds.map((id) => ({
    id,
    fields: { [TICKLE_DATE_FIELD]: date },
  }));

  const res = await fetch(`${TEABLE_URL}/api/table/${TABLE_ID}/record`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TEABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fieldKeyType: "id", records }),
  });

  if (!res.ok) {
    throw new Error("Failed to update tickle date");
  }

  revalidatePath("/projects");
}
