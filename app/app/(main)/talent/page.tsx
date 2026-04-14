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
  primary_talent_category: string | null;
  overall_rating: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  // Full tag list for this record, shared across every expanded instance so
  // the Areas column can render the complete set on any row. `areas` is the
  // comma-joined name string (back-compat for the existing read-only Areas
  // column); `areas_all` carries id+name for MultiPillSelect.
  areas: string | null;
  areas_all: Array<{ id: string; name: string }>;
  // Group instance identity. Non-null only when expandOn === "area".
  area_id: string | null;
  area_name: string | null;
  area_color: string | null;
}

async function getTalent(
  options: { expandOn?: "area" | null } = {},
): Promise<{ rows: TalentRow[]; recordCount: number }> {
  const expandOn = options.expandOn ?? null;

  if (expandOn === null) {
    const result = await poolV002.query(`
      SELECT t.id, t.name, t.primary_talent_category,
             t.overall_rating, t.website, t.instagram, t.notes,
             string_agg(DISTINCT ta.name, ', ') as areas,
             COALESCE(
               (SELECT json_agg(
                         json_build_object('id', sta.id::text, 'name', sta.name)
                         ORDER BY sta.name
                       )
                FROM talent_area_links stal
                JOIN talent_areas sta ON sta.id = stal.area_id
                WHERE stal.talent_id = t.id),
               '[]'::json
             ) as areas_all
      FROM talent t
      LEFT JOIN talent_area_links tal ON t.id = tal.talent_id
      LEFT JOIN talent_areas ta ON tal.area_id = ta.id
      LEFT JOIN talent_categories tc ON t.primary_talent_category = tc.name
      LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
      GROUP BY t.id, tc.sort_order, trl.sort_order
      ORDER BY tc.sort_order NULLS LAST, trl.sort_order NULLS LAST, t.name
    `);
    const rows: TalentRow[] = result.rows.map((r) => ({
      ...r,
      record_id: r.id,
      display_id: r.id,
      areas_all: r.areas_all ?? [],
      area_id: null,
      area_name: null,
      area_color: null,
    }));
    return { rows, recordCount: rows.length };
  }

  // expandOn === "area": two-stage CTE. Inner CTE pins the distinct talent set;
  // outer LEFT JOIN expands each talent once per tag, or once with area_id =
  // null when the talent has no tags. LEFT JOIN is the "Uncategorized"
  // contract — zero-area talents are never silently dropped. Outer ORDER BY
  // puts the area key FIRST: area is the outermost icicle group in this mode,
  // so adjacent rows need to share an area for computeGroupSpans() to merge
  // them into a single span. ta.sort_order honors whatever order the user set
  // on the pick-list page; Uncategorized (NULLs) sorts to the end.
  const result = await poolV002.query(`
    WITH distinct_talent AS (
      SELECT t.id, t.name, t.primary_talent_category,
             t.overall_rating, t.website, t.instagram, t.notes,
             tc.sort_order as _cat_sort,
             trl.sort_order as _rating_sort
      FROM talent t
      LEFT JOIN talent_categories tc ON t.primary_talent_category = tc.name
      LEFT JOIN talent_rating_levels trl ON t.overall_rating = trl.name
    )
    SELECT dt.id, dt.name, dt.primary_talent_category,
           dt.overall_rating, dt.website, dt.instagram, dt.notes,
           ta.id::text AS area_id,
           ta.name     AS area_name,
           ta.color    AS area_color
    FROM distinct_talent dt
    LEFT JOIN talent_area_links tal ON tal.talent_id = dt.id
    LEFT JOIN talent_areas      ta  ON ta.id = tal.area_id
    ORDER BY ta.sort_order NULLS LAST,
             ta.name NULLS LAST,
             dt._cat_sort NULLS LAST,
             dt._rating_sort NULLS LAST,
             dt.name
  `);

  // Bucket the expanded rows by record_id and build the full tag list once
  // per record, then broadcast it to each rendered instance. JS-only; one
  // extra pass over the result rows, no extra round-trip.
  const areasByRecord = new Map<string, Array<{ id: string; name: string }>>();
  for (const r of result.rows) {
    if (!areasByRecord.has(r.id)) areasByRecord.set(r.id, []);
    if (r.area_id != null && r.area_name != null) {
      areasByRecord.get(r.id)!.push({ id: r.area_id, name: r.area_name });
    }
  }

  const rows: TalentRow[] = result.rows.map((r) => {
    const areas_all = areasByRecord.get(r.id) ?? [];
    return {
      ...r,
      record_id: r.id,
      display_id: makeDisplayId(r.id, r.area_id),
      areas: areas_all.length > 0 ? areas_all.map((a) => a.name).join(", ") : null,
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

async function getAreaOptions(): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color
     FROM talent_areas
     ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<{ groupBy?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawGroupBy = Array.isArray(params.groupBy)
    ? params.groupBy[0]
    : params.groupBy;
  const groupBy: "category" | "area" = rawGroupBy === "area" ? "area" : "category";

  const [
    { rows: talent, recordCount },
    categoryOptions,
    ratingOptions,
    areaOptions,
  ] = await Promise.all([
    getTalent({ expandOn: groupBy === "area" ? "area" : null }),
    getLookupOptions("talent_categories"),
    getLookupOptions("talent_rating_levels"),
    getAreaOptions(),
  ]);
  return (
    <>
      <Realtime
        tables={[
          "talent",
          "talent_area_links",
          "talent_areas",
          "talent_categories",
          "talent_rating_levels",
        ]}
      />
      <TalentTable
        data={talent}
        recordCount={recordCount}
        groupBy={groupBy}
        categoryOptions={categoryOptions}
        ratingOptions={ratingOptions}
        areaOptions={areaOptions}
      />
    </>
  );
}
