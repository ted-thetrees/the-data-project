import { poolV002 } from "@/lib/db";
import { TalentTable } from "./talent-table";
import { Realtime } from "@/components/realtime";

export const metadata = { title: "Talent" };
export const dynamic = "force-dynamic";

interface TalentRow {
  id: string;
  name: string;
  architecture: string | null;
  interiors: string | null;
  landscape: string | null;
  lighting: string | null;
  kitchens: string | null;
  archviz: string | null;
  primary_talent: string | null;
  primary_talent_category: string | null;
  overall_rating: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  areas: string | null;
}

async function getTalent(): Promise<TalentRow[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name, t.architecture, t.interiors, t.landscape, t.lighting,
           t.kitchens, t.archviz, t.primary_talent, t.primary_talent_category,
           t.overall_rating, t.website, t.instagram, t.notes,
           string_agg(DISTINCT ta.name, ', ') as areas
    FROM talent t
    LEFT JOIN talent_area_links tal ON t.id = tal.talent_id
    LEFT JOIN talent_areas ta ON tal.area_id = ta.id
    LEFT JOIN talent_categories tc ON t.primary_talent_category = tc.name
    LEFT JOIN talent_types tt ON t.primary_talent = tt.name
    LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
    GROUP BY t.id, tc.sort_order, tt.sort_order, trl.sort_order
    ORDER BY tc.sort_order NULLS LAST, tt.sort_order NULLS LAST, trl.sort_order NULLS LAST, t.name
  `);
  return result.rows;
}

export default async function TalentPage() {
  const talent = await getTalent();
  return (
    <>
      <Realtime
        tables={[
          "talent",
          "talent_area_links",
          "talent_areas",
          "talent_categories",
          "talent_types",
          "talent_rating_levels",
        ]}
      />
      <TalentTable data={talent} />
    </>
  );
}
