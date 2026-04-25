"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";

function revalidate() {
  updateTag("calories");
  revalidatePath("/calories");
}

function toTitleCase(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function createLogEntry() {
  await poolV002.query(
    `INSERT INTO calorie_log (item, calories) VALUES ('Untitled', 0)`,
  );
  revalidate();
}

export async function updateLogItem(id: string, rawItem: string) {
  const item = toTitleCase(rawItem || "Untitled");
  const matched = await poolV002.query<{ id: string; calories: number }>(
    `SELECT id::text, calories FROM calorie_foods WHERE lower(name) = lower($1) LIMIT 1`,
    [item],
  );
  if (matched.rows[0]) {
    await poolV002.query(
      `UPDATE calorie_log SET item = $1, food_id = $2, calories = $3 WHERE id = $4`,
      [item, matched.rows[0].id, matched.rows[0].calories, id],
    );
  } else {
    await poolV002.query(
      `UPDATE calorie_log SET item = $1, food_id = NULL WHERE id = $2`,
      [item, id],
    );
  }
  revalidate();
}

export async function updateLogCalories(id: string, calories: number) {
  if (!Number.isFinite(calories) || calories < 0) {
    throw new Error("Invalid calories");
  }
  await poolV002.query(
    `UPDATE calorie_log SET calories = $1 WHERE id = $2`,
    [Math.round(calories), id],
  );
  revalidate();
}

export async function deleteLogEntry(id: string) {
  await poolV002.query(`DELETE FROM calorie_log WHERE id = $1`, [id]);
  revalidate();
}

export async function createFood() {
  // Use a UUID-suffixed placeholder to satisfy the UNIQUE constraint without
  // race conditions. The user renames it inline immediately after creation.
  await poolV002.query(
    `INSERT INTO calorie_foods (name, calories)
     VALUES ('Untitled ' || substring(gen_random_uuid()::text, 1, 4), 0)`,
  );
  revalidate();
}

export async function updateFoodName(id: string, rawName: string) {
  const name = toTitleCase(rawName || "Untitled");
  await poolV002.query(
    `UPDATE calorie_foods SET name = $1 WHERE id = $2`,
    [name, id],
  );
  revalidate();
}

export async function updateFoodCalories(id: string, calories: number) {
  if (!Number.isFinite(calories) || calories < 0) {
    throw new Error("Invalid calories");
  }
  await poolV002.query(
    `UPDATE calorie_foods SET calories = $1 WHERE id = $2`,
    [Math.round(calories), id],
  );
  revalidate();
}

export async function deleteFood(id: string) {
  await poolV002.query(`DELETE FROM calorie_foods WHERE id = $1`, [id]);
  revalidate();
}
