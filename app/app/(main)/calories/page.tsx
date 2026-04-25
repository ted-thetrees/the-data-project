import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { CaloriesClient, type LogRow } from "./calories-client";

export const metadata = { title: "Calories" };
export const dynamic = "force-dynamic";

const DAILY_ALLOWANCE = 1300;

async function getLog(): Promise<LogRow[]> {
  const result = await poolV002.query<LogRow>(`
    SELECT l.id::text,
           l.item,
           l.amount,
           l.calories,
           to_char(l.logged_on, 'YYYY-MM-DD') AS logged_on,
           l.created_at,
           f.name AS food_name
    FROM calorie_log l
    LEFT JOIN calorie_foods f ON l.food_id = f.id
    ORDER BY l.logged_on DESC, l.created_at ASC
  `);
  return result.rows;
}

const getCachedLog = unstable_cache(getLog, ["calories-log-v2"], {
  tags: ["calories"],
  revalidate: 30,
});

export default async function CaloriesPage() {
  const log = await getCachedLog();

  return (
    <PageShell title="Calories" count={log.length} maxWidth="">
      <Realtime tables={["calorie_log", "calorie_foods"]} />
      <Subtitle>
        Food entries grouped by date. Type a saved food name to auto-fill its
        calories.
      </Subtitle>
      <CaloriesClient log={log} allowance={DAILY_ALLOWANCE} />
    </PageShell>
  );
}
