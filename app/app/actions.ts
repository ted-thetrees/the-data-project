"use server";

import { revalidatePath } from "next/cache";
import { removePassphrase } from "@/lib/passphrase";

const TEABLE_KEY = process.env.TEABLE_API_KEY!;
const TEABLE_URL = process.env.TEABLE_URL || "https://teable.ifnotfor.com";
const TABLE_ID = "tblxWdmSHnBdDYjcmKX";

export async function deleteRecord(recordId: string) {
  const res = await fetch(
    `${TEABLE_URL}/api/table/${TABLE_ID}/record/${recordId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TEABLE_KEY}` },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete record");
  }

  await removePassphrase(recordId);
  revalidatePath("/");
}
