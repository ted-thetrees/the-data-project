import { poolV002 } from "@/lib/db";
import { CrimeSeriesTable } from "./crime-series-table";

export const metadata = { title: "Series" };
export const dynamic = "force-dynamic";

export interface SeriesRow {
  id: string;
  title: string;
  network: string | null;
  youtube_trailer: string | null;
  status: string | null;
  status_color: string | null;
  status_sort: number | null;
  release_date: string | null;
}

async function getData(): Promise<SeriesRow[]> {
  const result = await poolV002.query(`
    SELECT cs.id, cs.title, cs.network, cs.youtube_trailer,
           cs.release_date::text,
           s.name as status, s.color as status_color, s.sort_order as status_sort
    FROM crime_series cs
    LEFT JOIN crime_series_statuses s ON cs.status_id = s.id
    ORDER BY s.sort_order NULLS LAST, cs.has_trailer DESC, cs.title ASC
  `);
  return result.rows;
}

export default async function CrimeSeriesPage() {
  const data = await getData();
  return <CrimeSeriesTable data={data} />;
}
