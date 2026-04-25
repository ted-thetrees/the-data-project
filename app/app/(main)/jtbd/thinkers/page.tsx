import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import { getPalettes } from "../../pick-lists/lib";
import { ThinkersTable, type ThinkerRow } from "./thinkers-table";
import { THINKERS_STORAGE_KEY, THINKERS_DEFAULT_WIDTHS } from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "JTBD — Thinkers" };
export const dynamic = "force-dynamic";

async function getThinkers(): Promise<ThinkerRow[]> {
  const result = await poolV002.query(`
    SELECT t.id::text, t.name, t.color, t.notes,
           COALESCE(
             (SELECT json_agg(j.id::text ORDER BY j.sort_order NULLS LAST, j.name)
              FROM jtbd_thinker_jobs tj
              JOIN jtbd_jobs j ON j.id = tj.job_id
              WHERE tj.thinker_id = t.id),
             '[]'::json
           ) AS job_ids
    FROM jtbd_thinkers t
    ORDER BY t.sort_order NULLS LAST, t.name
  `);
  return result.rows.map((r) => ({
    ...r,
    job_ids: r.job_ids ?? [],
  }));
}

const getCachedThinkers = unstable_cache(getThinkers, ["jtbd-thinkers-v1"], {
  tags: ["jtbd"],
  revalidate: 30,
});

async function getJobOptions(): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color
     FROM jtbd_jobs
     ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function ThinkersPage() {
  const [thinkers, jobOptions, palettes, initialParams] = await Promise.all([
    getCachedThinkers(),
    getJobOptions(),
    getPalettes(),
    getInitialViewParams(THINKERS_STORAGE_KEY, THINKERS_DEFAULT_WIDTHS),
  ]);
  return (
    <PageShell title="Thinkers" count={thinkers.length} maxWidth="">
      <Realtime
        tables={[
          "jtbd_thinkers",
          "jtbd_jobs",
          "jtbd_thinker_jobs",
          "color_palettes",
        ]}
      />
      <Subtitle>
        Writers and thinkers who espouse the importance of particular jobs.
      </Subtitle>
      <ThinkersTable
        rows={thinkers}
        jobOptions={jobOptions}
        palettes={palettes}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
