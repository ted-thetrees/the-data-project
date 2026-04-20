#!/usr/bin/env node
// Usage: node --env-file=.env.local scripts/log-calorie.mjs "Hot Dog" [calories]
// Adds a row to calorie_log for today. If the item matches a saved food
// (case-insensitive), food_id and calories are taken from calorie_foods
// unless an explicit calories argument overrides them.

import pg from "pg";

const [, , rawItem, rawCalories] = process.argv;

if (!rawItem) {
  console.error("Usage: log-calorie.mjs <item> [calories]");
  process.exit(1);
}

const item = rawItem
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (c) => c.toUpperCase());

const explicitCalories =
  rawCalories !== undefined ? Number(rawCalories) : undefined;
if (rawCalories !== undefined && !Number.isFinite(explicitCalories)) {
  console.error(`Invalid calories: ${rawCalories}`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL_V002;
if (!connectionString) {
  console.error("DATABASE_URL_V002 not set. Run from app/ with --env-file=.env.local");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  const matched = await pool.query(
    `SELECT id::text, calories FROM calorie_foods WHERE lower(name) = lower($1) LIMIT 1`,
    [item],
  );
  const food = matched.rows[0];

  let foodId = null;
  let calories;
  if (food) {
    foodId = food.id;
    calories = explicitCalories ?? food.calories;
  } else if (explicitCalories !== undefined) {
    calories = explicitCalories;
  } else {
    console.error(
      `No saved food named "${item}" and no calories provided. Pass calories as the second argument.`,
    );
    process.exit(1);
  }

  const inserted = await pool.query(
    `INSERT INTO calorie_log (item, food_id, calories)
     VALUES ($1, $2, $3)
     RETURNING id::text, item, calories, logged_on`,
    [item, foodId, Math.round(calories)],
  );

  const row = inserted.rows[0];
  console.log(
    JSON.stringify({
      id: row.id,
      item: row.item,
      calories: row.calories,
      logged_on: row.logged_on,
      linked_food_id: foodId,
    }),
  );
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
} finally {
  await pool.end();
}
