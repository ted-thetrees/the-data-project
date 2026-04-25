import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { FoodsClient, type FoodRow } from "./foods-client";
import { FOODS_STORAGE_KEY, FOODS_DEFAULT_WIDTHS } from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "Foods" };
export const dynamic = "force-dynamic";

async function getFoods(): Promise<FoodRow[]> {
  const result = await poolV002.query<FoodRow>(`
    SELECT id::text, name, calories
    FROM calorie_foods
    ORDER BY name
  `);
  return result.rows;
}

const getCachedFoods = unstable_cache(getFoods, ["foods-v1"], {
  tags: ["calories"],
  revalidate: 30,
});

export default async function FoodsPage() {
  const [foods, initialParams] = await Promise.all([
    getCachedFoods(),
    getInitialViewParams(FOODS_STORAGE_KEY, FOODS_DEFAULT_WIDTHS),
  ]);

  return (
    <PageShell title="Foods" count={foods.length} maxWidth="">
      <Realtime tables={["calorie_foods"]} />
      <Subtitle>
        Reusable food definitions with default calorie counts. Used to
        auto-fill calories when typing an item name on the Calories page.
      </Subtitle>
      <FoodsClient foods={foods} initialParams={initialParams} />
    </PageShell>
  );
}
