"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";

function revalidate() {
  updateTag("calories");
  revalidatePath("/foods");
  revalidatePath("/calories");
}

function toTitleCase(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function createFood() {
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
