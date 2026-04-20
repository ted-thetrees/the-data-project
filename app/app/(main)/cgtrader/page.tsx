import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { CgtraderTable, type CgtraderRow } from "./cgtrader-table";
import { CGTRADER_STORAGE_KEY, CGTRADER_DEFAULT_WIDTHS } from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "CGTrader" };
export const dynamic = "force-dynamic";

async function getRows(): Promise<CgtraderRow[]> {
  const result = await poolV002.query<CgtraderRow>(`
    SELECT id::text AS id, url, image_url, rating
    FROM cgtrader_items
    ORDER BY rating DESC NULLS LAST, created_at DESC, id
  `);
  return result.rows;
}

export default async function CgtraderPage() {
  const [rows, initialParams] = await Promise.all([
    getRows(),
    getInitialViewParams(CGTRADER_STORAGE_KEY, CGTRADER_DEFAULT_WIDTHS),
  ]);
  return (
    <PageShell title="CGTrader" count={rows.length} maxWidth="">
      <Realtime tables={["cgtrader_items"]} />
      <CgtraderTable rows={rows} initialParams={initialParams} />
    </PageShell>
  );
}
