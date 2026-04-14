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

export async function updateTalentName(talentId: string, name: string) {
  await poolV002.query(
    `UPDATE talent SET name = $1 WHERE id = $2`,
    [name || "Untitled", talentId],
  );
  revalidateTalentPages();
}

export async function createTalent(
  category: string | null,
  primaryTalent: string | null,
  rating: string | null,
) {
  await poolV002.query(
    `INSERT INTO talent (name, primary_talent_category, primary_talent, overall_rating)
     VALUES ('Untitled', $1, $2, $3)`,
    [category, primaryTalent, rating],
  );
  revalidateTalentPages();
}
