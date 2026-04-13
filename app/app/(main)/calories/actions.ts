"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/calories");
}

function toTitleCase(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function addLogEntry(formData: FormData) {
  const rawName = String(formData.get("name") ?? "").trim();
  const rawCalories = String(formData.get("calories") ?? "").trim();
  if (!rawName) return;

  const name = toTitleCase(rawName);

  const existing = await poolV002.query<{ id: string; calories: number }>(
    `SELECT id::text, calories FROM calorie_foods WHERE lower(name) = lower($1) LIMIT 1`,
    [name],
  );

  let foodId: string | null = null;
  let calories: number;

  if (existing.rows[0]) {
    foodId = existing.rows[0].id;
    calories = rawCalories ? Number(rawCalories) : existing.rows[0].calories;
  } else {
    if (!rawCalories) throw new Error("Calories required for a new food");
    calories = Number(rawCalories);
  }

  if (!Number.isFinite(calories) || calories < 0) {
    throw new Error("Invalid calories");
  }

  await poolV002.query(
    `INSERT INTO calorie_log (food_id, item, calories) VALUES ($1, $2, $3)`,
    [foodId, name, Math.round(calories)],
  );
  revalidate();
}

export async function deleteLogEntry(id: string) {
  await poolV002.query(`DELETE FROM calorie_log WHERE id = $1`, [id]);
  revalidate();
}

export async function addFood(formData: FormData) {
  const rawName = String(formData.get("name") ?? "").trim();
  const rawCalories = String(formData.get("calories") ?? "").trim();
  if (!rawName || !rawCalories) return;

  const name = toTitleCase(rawName);
  const calories = Number(rawCalories);
  if (!Number.isFinite(calories) || calories < 0) {
    throw new Error("Invalid calories");
  }

  await poolV002.query(
    `INSERT INTO calorie_foods (name, calories) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET calories = EXCLUDED.calories`,
    [name, Math.round(calories)],
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
