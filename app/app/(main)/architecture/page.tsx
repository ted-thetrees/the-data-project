import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import {
  ArchitectureTable,
  type ArchitectureRow,
} from "./architecture-table";

export const metadata = { title: "Architecture" };
export const dynamic = "force-dynamic";

async function getData(): Promise<ArchitectureRow[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name, t.overall_rating, t.website, t.instagram, t.notes,
           trl.color as rating_color,
           string_agg(DISTINCT ta.name, ', ') as areas
    FROM talent t
    LEFT JOIN talent_area_links tal ON t.id = tal.talent_id
    LEFT JOIN talent_areas ta ON tal.area_id = ta.id
    LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
    WHERE t.primary_talent_category = 'Places'
      AND t.primary_talent = 'Architecture'
    GROUP BY t.id, trl.sort_order, trl.color
    ORDER BY trl.sort_order ASC NULLS LAST, t.name
  `);
  return result.rows;
}

async function getRatingOptions(): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT name, color FROM talent_rating_levels ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows.map((r: { name: string; color: string | null }) => ({
    id: r.name,
    name: r.name,
    color: r.color,
  }));
}

export default async function ArchitecturePage() {
  const [data, ratingOptions] = await Promise.all([
    getData(),
    getRatingOptions(),
  ]);

  return (
    <PageShell title="Architecture" count={data.length} maxWidth="">
      <Realtime
        tables={[
          "talent",
          "talent_area_links",
          "talent_areas",
          "talent_rating_levels",
        ]}
      />
      <Subtitle>Places &middot; Architecture &middot; sorted by Rating</Subtitle>
      <ArchitectureTable rows={data} ratingOptions={ratingOptions} />
    </PageShell>
  );
}
