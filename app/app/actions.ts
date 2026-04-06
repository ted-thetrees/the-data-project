"use server";

import { revalidatePath } from "next/cache";
import { removePassphrase } from "@/lib/passphrase";
import { pool, BR } from "@/lib/db";

export async function deleteRecord(recordId: string) {
  await pool.query(
    `UPDATE ${BR.Inbox} SET trashed = true, updated_on = NOW() WHERE id = $1`,
    [parseInt(recordId)]
  );

  await removePassphrase(recordId);
  revalidatePath("/");
}
