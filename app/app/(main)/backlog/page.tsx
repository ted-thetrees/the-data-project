import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
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
      b.primary_category_id::text   AS primary_category_id,
      b.yes_or_not_yet_id::text     AS yes_or_not_yet_id,
      b.design_paradigm_id::text    AS design_paradigm_id,
      b.status_id::text             AS status_id,
      b.prototype_stage_id::text    AS prototype_stage_id
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
    yesOrNotYetOptions,
    designParadigmOptions,
    statusOptions,
    prototypeStageOptions,
    initialParams,
  ] = await Promise.all([
    getBacklog(),
    getLookupOptions("backlog_priorities"),
    getLookupOptions("backlog_categories"),
    getLookupOptions("backlog_yes_or_not_yet"),
    getLookupOptions("backlog_design_paradigms"),
    getLookupOptions("backlog_statuses"),
    getLookupOptions("backlog_prototype_stages"),
    getInitialViewParams(BACKLOG_STORAGE_KEY, BACKLOG_DEFAULT_WIDTHS),
  ]);

  return (
    <PageShell title="Backlog" count={rows.length} maxWidth="">
      <Realtime
        tables={[
          "backlog",
          "backlog_priorities",
          "backlog_categories",
          "backlog_yes_or_not_yet",
          "backlog_design_paradigms",
          "backlog_statuses",
          "backlog_prototype_stages",
        ]}
      />
      <BacklogTable
        rows={rows}
        priorityOptions={priorityOptions}
        categoryOptions={categoryOptions}
        yesOrNotYetOptions={yesOrNotYetOptions}
        designParadigmOptions={designParadigmOptions}
        statusOptions={statusOptions}
        prototypeStageOptions={prototypeStageOptions}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
