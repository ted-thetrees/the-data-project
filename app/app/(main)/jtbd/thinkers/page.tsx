import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import { getPalettes } from "../../pick-lists/lib";
import { ThinkersTable, type ThinkerRow } from "./thinkers-table";

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

async function getJobOptions(): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color
     FROM jtbd_jobs
     ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function ThinkersPage() {
  const [thinkers, jobOptions, palettes] = await Promise.all([
    getThinkers(),
    getJobOptions(),
    getPalettes(),
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
      />
    </PageShell>
  );
}
