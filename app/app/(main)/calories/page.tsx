import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { CaloriesClient, type LogRow, type FoodRow } from "./calories-client";

export const metadata = { title: "Calories" };
export const dynamic = "force-dynamic";

const DAILY_ALLOWANCE = 1300;

async function getTodayLog(): Promise<LogRow[]> {
  const result = await poolV002.query<LogRow>(`
    SELECT l.id::text, l.item, l.calories, l.created_at,
           f.name as food_name
    FROM calorie_log l
    LEFT JOIN calorie_foods f ON l.food_id = f.id
    WHERE l.logged_on = CURRENT_DATE
    ORDER BY l.created_at ASC
  `);
  return result.rows;
}

async function getFoods(): Promise<FoodRow[]> {
  const result = await poolV002.query<FoodRow>(`
    SELECT id::text, name, calories
    FROM calorie_foods
    ORDER BY name
  `);
  return result.rows;
}

export default async function CaloriesPage() {
  const [log, foods] = await Promise.all([getTodayLog(), getFoods()]);
  const total = log.reduce((sum, row) => sum + row.calories, 0);

  return (
    <PageShell title="Calories" count={log.length} maxWidth="">
      <Realtime tables={["calorie_log", "calorie_foods"]} />
      <CaloriesClient
        log={log}
        foods={foods}
        total={total}
        allowance={DAILY_ALLOWANCE}
      />
    </PageShell>
  );
}
