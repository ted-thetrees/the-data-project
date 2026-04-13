"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateTalentOverallRating(
  talentId: string,
  rating: string,
) {
  await poolV002.query(
    `UPDATE talent SET overall_rating = $1 WHERE id = $2`,
    [rating, talentId],
  );
  revalidatePath("/architecture");
  revalidatePath("/talent");
}
