import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import { getPalettes } from "../../pick-lists/lib";
import { JobsTable, type JobRow } from "./jobs-table";
import { JOBS_STORAGE_KEY, JOBS_DEFAULT_WIDTHS } from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "JTBD — Jobs" };
export const dynamic = "force-dynamic";

async function getJobs(): Promise<JobRow[]> {
  const result = await poolV002.query(`
    SELECT j.id::text, j.name, j.color, j.notes,
           COALESCE(
             (SELECT json_agg(t.id::text ORDER BY t.sort_order NULLS LAST, t.name)
              FROM jtbd_thinker_jobs tj
              JOIN jtbd_thinkers t ON t.id = tj.thinker_id
              WHERE tj.job_id = j.id),
             '[]'::json
           ) AS thinker_ids,
           COALESCE(
             (SELECT json_agg(c.id::text ORDER BY c.sort_order NULLS LAST, c.name)
              FROM jtbd_component_jobs cj
              JOIN jtbd_components c ON c.id = cj.component_id
              WHERE cj.job_id = j.id),
             '[]'::json
           ) AS component_ids
    FROM jtbd_jobs j
    ORDER BY j.sort_order NULLS LAST, j.name
  `);
  return result.rows.map((r) => ({
    ...r,
    thinker_ids: r.thinker_ids ?? [],
    component_ids: r.component_ids ?? [],
  }));
}

async function getLookupOptions(table: string): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color
     FROM ${table}
     ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function JobsPage() {
  const [jobs, thinkerOptions, componentOptions, palettes, initialParams] =
    await Promise.all([
      getJobs(),
      getLookupOptions("jtbd_thinkers"),
      getLookupOptions("jtbd_components"),
      getPalettes(),
      getInitialViewParams(JOBS_STORAGE_KEY, JOBS_DEFAULT_WIDTHS),
    ]);
  return (
    <PageShell title="Jobs" count={jobs.length} maxWidth="">
      <Realtime
        tables={[
          "jtbd_jobs",
          "jtbd_thinkers",
          "jtbd_components",
          "jtbd_thinker_jobs",
          "jtbd_component_jobs",
          "color_palettes",
        ]}
      />
      <Subtitle>
        The jobs components do for users — what they make the user feel or
        accomplish.
      </Subtitle>
      <JobsTable
        rows={jobs}
        thinkerOptions={thinkerOptions}
        componentOptions={componentOptions}
        palettes={palettes}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
