import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { BacklogTable, type BacklogRow } from "./backlog-table";
import { BACKLOG_STORAGE_KEY, BACKLOG_DEFAULT_WIDTHS } from "./config";
import type { PillOption } from "@/components/pill";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "Backlog" };
export const dynamic = "force-dynamic";

async function getBacklog(): Promise<BacklogRow[]> {
  const result = await poolV002.query<BacklogRow>(`
    SELECT
      b.id::text                    AS id,
      b.main_entry,
      b.details,
      b.image_url,
      b.sort_order,
      b.priority_id::text           AS priority_id,
      b.primary_category_id::text   AS primary_category_id
    FROM backlog b
    LEFT JOIN backlog_priorities p ON p.id = b.priority_id
    LEFT JOIN backlog_categories c ON c.id = b.primary_category_id
    ORDER BY
      p.sort_order NULLS LAST,
      c.sort_order NULLS LAST,
      b.sort_order NULLS LAST,
      b.main_entry
  `);
  return result.rows;
}

const getCachedBacklog = unstable_cache(getBacklog, ["backlog-rows-v1"], {
  tags: ["backlog"],
  revalidate: 30,
});

async function getLookupOptions(
  table: string,
  orderClause = "ORDER BY sort_order NULLS LAST, name",
): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color FROM ${table} ${orderClause}`,
  );
  return result.rows;
}

export default async function BacklogPage() {
  const [
    rows,
    priorityOptions,
    categoryOptions,
    initialParams,
  ] = await Promise.all([
    getCachedBacklog(),
    getLookupOptions("backlog_priorities"),
    getLookupOptions("backlog_categories"),
    getInitialViewParams(BACKLOG_STORAGE_KEY, BACKLOG_DEFAULT_WIDTHS),
  ]);

  return (
    <PageShell title="Backlog" count={rows.length} maxWidth="">
      <Realtime
        tables={[
          "backlog",
          "backlog_priorities",
          "backlog_categories",
        ]}
      />
      <Subtitle>A running list of things I might build — ranked by priority and grouped by category.</Subtitle>
      <BacklogTable
        rows={rows}
        priorityOptions={priorityOptions}
        categoryOptions={categoryOptions}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
