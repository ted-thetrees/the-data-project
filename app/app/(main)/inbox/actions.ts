"use server";

import { revalidatePath } from "next/cache";
import { removePassphrase } from "@/lib/passphrase";
import { pool } from "@/lib/db";

export async function deleteRecord(recordId: string) {
  await pool.query(
    `DELETE FROM inbox WHERE id = $1`,
    [recordId]
  );

  await removePassphrase(recordId);
  revalidatePath("/inbox");
}
