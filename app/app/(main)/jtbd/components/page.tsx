import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import type { PillOption } from "@/components/pill";
import { ComponentsTable, type ComponentRow } from "./components-table";
import { COMPONENTS_STORAGE_KEY, COMPONENTS_DEFAULT_WIDTHS } from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "JTBD — Components" };
export const dynamic = "force-dynamic";

async function getComponents(): Promise<ComponentRow[]> {
  const result = await poolV002.query(`
    SELECT c.id::text, c.name, c.notes,
           COALESCE(
             (SELECT json_agg(j.id::text ORDER BY j.sort_order NULLS LAST, j.name)
              FROM jtbd_component_jobs cj
              JOIN jtbd_jobs j ON j.id = cj.job_id
              WHERE cj.component_id = c.id),
             '[]'::json
           ) AS job_ids
    FROM jtbd_components c
    ORDER BY c.sort_order NULLS LAST, c.name
  `);
  return result.rows.map((r) => ({
    ...r,
    job_ids: r.job_ids ?? [],
  }));
}

const getCachedComponents = unstable_cache(getComponents, ["jtbd-components-v1"], {
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

export default async function ComponentsPage() {
  const [components, jobOptions, initialParams] = await Promise.all([
    getCachedComponents(),
    getJobOptions(),
    getInitialViewParams(COMPONENTS_STORAGE_KEY, COMPONENTS_DEFAULT_WIDTHS),
  ]);
  return (
    <PageShell title="Components" count={components.length} maxWidth="">
      <Realtime
        tables={[
          "jtbd_components",
          "jtbd_jobs",
          "jtbd_component_jobs",
        ]}
      />
      <Subtitle>
        Parts of the If Not For app that do jobs for users.
      </Subtitle>
      <ComponentsTable
        rows={components}
        jobOptions={jobOptions}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
