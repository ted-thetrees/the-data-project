import { getInboxRecords, getInboxCount } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { InboxList } from "../inbox/inbox-list";
import { InboxRealtime } from "../inbox/inbox-realtime";
import { GridTable } from "../projects-main/grid-table";
import {
  getProjectsMainData,
  getTaskStatuses,
  getProjectStatuses,
  getUberProjects,
} from "../projects-main/data";

export const metadata = { title: "Super Combo" };
export const dynamic = "force-dynamic";

export default async function SuperComboPage() {
  const [
    inboxRecords,
    inboxCount,
    gridData,
    taskStatuses,
    projectStatuses,
    uberProjects,
  ] = await Promise.all([
    getInboxRecords(50),
    getInboxCount(),
    getProjectsMainData(),
    getTaskStatuses(),
    getProjectStatuses(),
    getUberProjects(),
  ]);

  return (
    <PageShell title="Super Combo" maxWidth="">
      <InboxRealtime />
      <Realtime
        tables={[
          "tasks",
          "projects",
          "uber_projects",
          "task_statuses",
          "project_statuses",
        ]}
      />
      <div className="flex gap-8 items-start">
        <section className="w-[560px] shrink-0">
          <h2 className="text-lg font-semibold mb-3">
            Inbox{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({inboxCount.toLocaleString()})
            </span>
          </h2>
          <InboxList records={inboxRecords} />
        </section>
        <section className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold mb-3">
            Projects | Main{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({gridData.length.toLocaleString()} rows)
            </span>
          </h2>
          <GridTable
            data={gridData}
            taskStatuses={taskStatuses}
            projectStatuses={projectStatuses}
            uberProjects={uberProjects}
            wrapped={false}
          />
        </section>
      </div>
    </PageShell>
  );
}
