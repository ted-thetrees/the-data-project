import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { JobsTable, type JobRow } from "./jobs-table";

export const metadata = { title: "JTBD — Jobs" };
export const dynamic = "force-dynamic";

async function getJobs(): Promise<JobRow[]> {
  const result = await poolV002.query(`
    SELECT j.id::text, j.name, j.color, j.notes,
           (SELECT COUNT(*) FROM jtbd_thinker_jobs tj WHERE tj.job_id = j.id)::int AS thinker_count,
           (SELECT COUNT(*) FROM jtbd_component_jobs cj WHERE cj.job_id = j.id)::int AS component_count
    FROM jtbd_jobs j
    ORDER BY j.sort_order NULLS LAST, j.name
  `);
  return result.rows;
}

export default async function JobsPage() {
  const jobs = await getJobs();
  return (
    <PageShell title="Jobs" count={jobs.length} maxWidth="">
      <Realtime
        tables={[
          "jtbd_jobs",
          "jtbd_thinker_jobs",
          "jtbd_component_jobs",
        ]}
      />
      <Subtitle>
        The jobs components do for users — what they make the user feel or
        accomplish.
      </Subtitle>
      <JobsTable rows={jobs} />
    </PageShell>
  );
}
