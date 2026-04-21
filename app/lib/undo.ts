"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Reverse the most recent user transaction recorded in audit.record_version.
 * Returns a short description of what was undone, or null if nothing to undo.
 */
export async function undoLast(): Promise<string | null> {
  const res = await poolV002.query<{ description: string | null }>(
    `SELECT audit.undo_last() AS description`,
  );
  const description = res.rows[0]?.description ?? null;
  if (description) {
    // The undone op could have touched any page; revalidate broadly.
    revalidatePath("/", "layout");
  }
  return description;
}
