import { poolV002 } from "@/lib/db";
import { SortTable } from "./sort-table";

export const metadata = { title: "Series | Sort" };
export const dynamic = "force-dynamic";

export interface SortRow {
  id: string;
  title: string;
  network: string | null;
  youtube_trailer: string | null;
  release_date: string | null;
  has_trailer: boolean;
}

async function getData(): Promise<SortRow[]> {
  const result = await poolV002.query(`
    SELECT cs.id, cs.title, cs.network, cs.youtube_trailer,
           cs.release_date::text, cs.has_trailer
    FROM crime_series cs
    WHERE cs.status_id = 'e5dc627e-c7e7-474e-b097-c23850c1906c'
    ORDER BY cs.has_trailer DESC, cs.title ASC
  `);
  return result.rows;
}

export default async function SortPage() {
  const data = await getData();
  return <SortTable data={data} />;
}
