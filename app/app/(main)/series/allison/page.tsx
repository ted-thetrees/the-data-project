import { poolV002 } from "@/lib/db";
import { AllisonEvalList } from "./allison-eval-list";

export const metadata = { title: "Allison to Eval" };
export const dynamic = "force-dynamic";

export interface AllisonRow {
  id: string;
  title: string;
  youtube_trailer: string | null;
}

async function getData(): Promise<AllisonRow[]> {
  const result = await poolV002.query(`
    SELECT cs.id, cs.title, cs.youtube_trailer
    FROM crime_series cs
    JOIN crime_series_statuses s ON cs.status_id = s.id
    WHERE s.name = 'Allison to Eval'
    ORDER BY cs.release_date DESC NULLS LAST, cs.title
  `);
  return result.rows;
}

export default async function AllisonEvalPage() {
  const data = await getData();
  return <AllisonEvalList data={data} />;
}
