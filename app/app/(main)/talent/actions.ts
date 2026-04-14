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

export async function addTalentArea(talentId: string, areaId: string) {
  await poolV002.query(
    `INSERT INTO talent_area_links (talent_id, area_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [talentId, areaId],
  );
  revalidateTalentPages();
}

export async function removeTalentArea(talentId: string, areaId: string) {
  await poolV002.query(
    `DELETE FROM talent_area_links
     WHERE talent_id = $1 AND area_id = $2`,
    [talentId, areaId],
  );
  revalidateTalentPages();
}

// Creates a new "Untitled" talent already tagged with `areaId`, atomically.
// Used by the "+ Add talent" row inside a group when the table is grouped by
// area of expertise — otherwise the new row would land in "Uncategorized"
// instead of the group the user clicked into.
export async function createTalentInArea(areaId: string) {
  await poolV002.query(
    `WITH new_talent AS (
       INSERT INTO talent (name) VALUES ('Untitled') RETURNING id
     )
     INSERT INTO talent_area_links (talent_id, area_id)
     SELECT id, $1 FROM new_talent`,
    [areaId],
  );
  revalidateTalentPages();
}
