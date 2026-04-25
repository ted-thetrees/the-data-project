import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { CrimeSeriesTable } from "./crime-series-table";
import { Realtime } from "@/components/realtime";
import type { PillOption } from "@/components/pill";
import {
  CRIME_SERIES_STORAGE_KEY,
  CRIME_SERIES_DEFAULT_WIDTHS,
} from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "Series" };
export const dynamic = "force-dynamic";

export interface SeriesRow {
  id: string;
  title: string;
  network: string | null;
  youtube_trailer: string | null;
  status_id: string | null;
  status: string | null;
  status_color: string | null;
  status_sort: number | null;
  release_date: string | null;
}

async function getData(): Promise<SeriesRow[]> {
  const result = await poolV002.query(`
    SELECT cs.id, cs.title, cs.network, cs.youtube_trailer,
           cs.release_date::text, cs.status_id::text,
           s.name as status, s.color as status_color, s.sort_order as status_sort
    FROM crime_series cs
    LEFT JOIN crime_series_statuses s ON cs.status_id = s.id
    ORDER BY s.sort_order NULLS LAST, cs.has_trailer DESC, cs.title ASC
  `);
  return result.rows;
}

const getCachedSeriesData = unstable_cache(getData, ["series-rows-v1"], {
  tags: ["series"],
  revalidate: 30,
});

async function getStatusOptions(): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text, name, color FROM crime_series_statuses ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function CrimeSeriesPage() {
  const [data, statusOptions, initialParams] = await Promise.all([
    getCachedSeriesData(),
    getStatusOptions(),
    getInitialViewParams(CRIME_SERIES_STORAGE_KEY, CRIME_SERIES_DEFAULT_WIDTHS),
  ]);
  return (
    <>
      <Realtime tables={["crime_series", "crime_series_statuses"]} />
      <CrimeSeriesTable
        data={data}
        statusOptions={statusOptions}
        initialParams={initialParams}
      />
    </>
  );
}
