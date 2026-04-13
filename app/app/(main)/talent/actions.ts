"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateTalentPages() {
  revalidatePath("/talent");
  revalidatePath("/architecture");
}

export async function updateTalentCategory(
  talentId: string,
  category: string,
) {
  await poolV002.query(
    `UPDATE talent SET primary_talent_category = $1 WHERE id = $2`,
    [category, talentId],
  );
  revalidateTalentPages();
}

export async function updateTalentPrimaryTalent(
  talentId: string,
  primaryTalent: string,
) {
  await poolV002.query(
    `UPDATE talent SET primary_talent = $1 WHERE id = $2`,
    [primaryTalent, talentId],
  );
  revalidateTalentPages();
}

export async function updateTalentOverallRating(
  talentId: string,
  rating: string,
) {
  await poolV002.query(
    `UPDATE talent SET overall_rating = $1 WHERE id = $2`,
    [rating, talentId],
  );
  revalidateTalentPages();
}
