"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function setCgtraderRating(id: string, rating: number | null) {
  if (rating !== null && (rating < 1 || rating > 5)) {
    throw new Error(`rating out of range: ${rating}`);
  }
  await poolV002.query(
    `UPDATE cgtrader_items SET rating = $1, updated_at = now() WHERE id = $2`,
    [rating, id],
  );
  revalidatePath("/cgtrader");
}

export async function deleteCgtraderItem(id: string) {
  await poolV002.query(`DELETE FROM cgtrader_items WHERE id = $1`, [id]);
  revalidatePath("/cgtrader");
}
