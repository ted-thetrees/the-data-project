import { poolV002 } from "@/lib/db";
import { TalentTable } from "./talent-table";
import { Realtime } from "@/components/realtime";
import type { PillOption } from "@/components/pill";
import { makeDisplayId } from "@/lib/table-grouping";

export const metadata = { title: "Talent" };
export const dynamic = "force-dynamic";

interface TalentRow {
  id: string;
  // Canonical record identity. Equal to `id`; duplicated here so consumers of
  // the multi-value grouping contract can key off `record_id` without caring
  // which table they're in. See lib/table-grouping.ts.
  record_id: string;
  // Unique per rendered row. In scalar mode equals `record_id`; in expansion
  // mode it's `makeDisplayId(record_id, area_id)`.
  display_id: string;
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
  category_color: string | null;
  talent_color: string | null;
  rating_color: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  // Full tag list for this record, shared across every expanded instance so
  // the Areas column can render the complete set on any row.
  areas: string | null;
  areas_all: string[];
  // Group instance identity. Non-null only when expandOn === "area".
  area_id: string | null;
  area_name: string | null;
}

async function getTalent(
  options: { expandOn?: "area" | null } = {},
): Promise<{ rows: TalentRow[]; recordCount: number }> {
  const expandOn = options.expandOn ?? null;

  if (expandOn === null) {
    const result = await poolV002.query(`
      SELECT t.id, t.name, t.architecture, t.interiors, t.landscape, t.lighting,
             t.kitchens, t.archviz, t.primary_talent, t.primary_talent_category,
             t.overall_rating, t.website, t.instagram, t.notes,
             tc.color as category_color,
             tt.color as talent_color,
             trl.color as rating_color,
             string_agg(DISTINCT ta.name, ', ') as areas,
             array_agg(DISTINCT ta.name) FILTER (WHERE ta.id IS NOT NULL) as areas_all
      FROM talent t
      LEFT JOIN talent_area_links tal ON t.id = tal.talent_id
      LEFT JOIN talent_areas ta ON tal.area_id = ta.id
      LEFT JOIN talent_categories tc ON t.primary_talent_category = tc.name
      LEFT JOIN talent_types tt ON t.primary_talent = tt.name
      LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
      GROUP BY t.id, tc.sort_order, tc.color, tt.sort_order, tt.color, trl.sort_order, trl.color
      ORDER BY tc.sort_order NULLS LAST, tt.sort_order NULLS LAST, trl.sort_order NULLS LAST, t.name
    `);
    const rows: TalentRow[] = result.rows.map((r) => ({
      ...r,
      record_id: r.id,
      display_id: r.id,
      areas_all: r.areas_all ?? [],
      area_id: null,
      area_name: null,
    }));
    return { rows, recordCount: rows.length };
  }

  // expandOn === "area": two-stage CTE. Inner CTE pins the distinct talent set
  // and its sort order; outer LEFT JOIN expands each talent once per tag, or
  // once with area_id = null when the talent has no tags. LEFT JOIN is the
  // "Uncategorized" contract — zero-area talents are never silently dropped.
  // Outer ORDER BY puts the expansion key LAST so category/talent/rating order
  // remains stable and computeGroupSpans() stays correct.
  const result = await poolV002.query(`
    WITH distinct_talent AS (
      SELECT t.id, t.name, t.architecture, t.interiors, t.landscape, t.lighting,
             t.kitchens, t.archviz, t.primary_talent, t.primary_talent_category,
             t.overall_rating, t.website, t.instagram, t.notes,
             tc.sort_order as _cat_sort,
             tc.color as category_color,
             tt.sort_order as _talent_sort,
             tt.color as talent_color,
             trl.sort_order as _rating_sort,
             trl.color as rating_color
      FROM talent t
      LEFT JOIN talent_categories tc ON t.primary_talent_category = tc.name
      LEFT JOIN talent_types tt ON t.primary_talent = tt.name
      LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
    )
    SELECT dt.id, dt.name, dt.architecture, dt.interiors, dt.landscape, dt.lighting,
           dt.kitchens, dt.archviz, dt.primary_talent, dt.primary_talent_category,
           dt.overall_rating, dt.website, dt.instagram, dt.notes,
           dt.category_color, dt.talent_color, dt.rating_color,
           ta.id   AS area_id,
           ta.name AS area_name
    FROM distinct_talent dt
    LEFT JOIN talent_area_links tal ON tal.talent_id = dt.id
    LEFT JOIN talent_areas      ta  ON ta.id = tal.area_id
    ORDER BY dt._cat_sort NULLS LAST,
             dt._talent_sort NULLS LAST,
             dt._rating_sort NULLS LAST,
             dt.name,
             ta.name NULLS FIRST
  `);

  const areasByRecord = new Map<string, string[]>();
  for (const r of result.rows) {
    if (!areasByRecord.has(r.id)) areasByRecord.set(r.id, []);
    if (r.area_name != null) {
      areasByRecord.get(r.id)!.push(r.area_name);
    }
  }

  const rows: TalentRow[] = result.rows.map((r) => {
    const areas_all = areasByRecord.get(r.id) ?? [];
    return {
      ...r,
      record_id: r.id,
      display_id: makeDisplayId(r.id, r.area_id),
      areas: areas_all.length > 0 ? areas_all.join(", ") : null,
      areas_all,
    };
  });

  return { rows, recordCount: areasByRecord.size };
}

async function getLookupOptions(table: string): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT name as id, name, color FROM ${table} ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function TalentPage() {
  const [{ rows: talent }, categoryOptions, typeOptions, ratingOptions] =
    await Promise.all([
      getTalent(),
      getLookupOptions("talent_categories"),
      getLookupOptions("talent_types"),
      getLookupOptions("talent_rating_levels"),
    ]);
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
      <TalentTable
        data={talent}
        categoryOptions={categoryOptions}
        typeOptions={typeOptions}
        ratingOptions={ratingOptions}
      />
    </>
  );
}
