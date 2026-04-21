import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import { getInitialViewParams } from "@/lib/table-views-cookie";
import { GetTable, type GetRow } from "./get-table";
import { GET_STORAGE_KEY, GET_DEFAULT_WIDTHS } from "./config";

export const metadata = { title: "Get" };
export const dynamic = "force-dynamic";

async function getRows(): Promise<GetRow[]> {
  const result = await poolV002.query<GetRow>(`
    SELECT
      g.id::text            AS id,
      g.name,
      g.category_id::text   AS category_id,
      g.status_id::text     AS status_id,
      g.source_id::text     AS source_id,
      g.source_detail,
      g.url,
      g.notes,
      g.created_at
    FROM get g
    LEFT JOIN get_statuses s    ON s.id = g.status_id
    LEFT JOIN get_categories c  ON c.id = g.category_id
    ORDER BY
      s.sort_order NULLS LAST,
      c.sort_order NULLS LAST,
      g.created_at DESC
  `);
  return result.rows;
}

async function getLookupOptions(table: string): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color FROM ${table} ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function GetPage() {
  const [rows, categoryOptions, statusOptions, sourceOptions, initialParams] =
    await Promise.all([
      getRows(),
      getLookupOptions("get_categories"),
      getLookupOptions("get_statuses"),
      getLookupOptions("get_sources"),
      getInitialViewParams(GET_STORAGE_KEY, GET_DEFAULT_WIDTHS),
    ]);

  return (
    <PageShell title="Get" count={rows.length} maxWidth="">
      <Realtime
        tables={["get", "get_categories", "get_statuses", "get_sources"]}
      />
      <Subtitle>
        Things I want to get — books, films, cars, homes, artworks. Click any
        cell to edit.
      </Subtitle>
      <GetTable
        rows={rows}
        categoryOptions={categoryOptions}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
