import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
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

export default async function ArchitecturePage() {
  const data = await getData();

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
      <p className="text-sm text-muted-foreground -mt-4 mb-6">
        Places &middot; Architecture &middot; sorted by Rating
      </p>
      <ArchitectureTable rows={data} />
    </PageShell>
  );
}
