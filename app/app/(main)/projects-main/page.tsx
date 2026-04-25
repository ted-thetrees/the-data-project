import { unstable_cache } from "next/cache";
import { GridTable } from "./grid-table";
import { Realtime } from "@/components/realtime";
import {
  getProjectsMainData,
  getTaskStatuses,
  getProjectStatuses,
  getActionOrderStatuses,
  getEntryStatuses,
  getUberProjects,
} from "./data";

const getCachedProjectsMainData = unstable_cache(
  getProjectsMainData,
  ["projects-main-rows-v1"],
  { tags: ["projects-main"], revalidate: 30 },
);
import {
  PROJECTS_MAIN_STORAGE_KEY,
  PROJECTS_MAIN_DEFAULT_WIDTHS,
} from "./config";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export interface TaskRow {
  id: string;
  task: string;
  task_status: string;
  task_status_id: string;
  task_color: string;
  task_order: number | null;
  result: string | null;
  task_notes: string | null;
  project: string;
  project_id: string;
  project_status: string;
  project_status_id: string;
  project_color: string;
  project_order: number | null;
  tickle_date: string | null;
  project_notes: string | null;
  action_order_status: string | null;
  action_order_status_id: string | null;
  action_order_color: string | null;
  entry_status: string | null;
  entry_status_id: string | null;
  entry_status_color: string | null;
  uber_project: string;
  uber_project_id: string;
  uber_order: number | null;
  uber_color: string | null;
}

export interface StatusOption {
  id: string;
  name: string;
  color: string | null;
}

export default async function GridPage() {
  const [
    data,
    taskStatuses,
    projectStatuses,
    actionOrderStatuses,
    entryStatuses,
    uberProjects,
    initialParams,
  ] = await Promise.all([
    getCachedProjectsMainData(),
    getTaskStatuses(),
    getProjectStatuses(),
    getActionOrderStatuses(),
    getEntryStatuses(),
    getUberProjects(),
    getInitialViewParams(
      PROJECTS_MAIN_STORAGE_KEY,
      PROJECTS_MAIN_DEFAULT_WIDTHS,
    ),
  ]);
  return (
    <>
      <Realtime
        tables={[
          "tasks",
          "projects",
          "uber_projects",
          "task_statuses",
          "project_statuses",
          "project_action_order_statuses",
          "project_entry_statuses",
        ]}
      />
      <GridTable
        data={data}
        taskStatuses={taskStatuses}
        projectStatuses={projectStatuses}
        actionOrderStatuses={actionOrderStatuses}
        entryStatuses={entryStatuses}
        uberProjects={uberProjects}
        initialParams={initialParams}
      />
    </>
  );
}
