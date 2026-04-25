import { unstable_cache } from "next/cache";
import { GridTable } from "./grid-table";
import { Realtime } from "@/components/realtime";
import {
  getProjectsMainData,
  getTaskStatuses,
  getPriorities,
  getStatuses,
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
  project_order: number | null;
  tickle_date: string | null;
  project_notes: string | null;
  priority: string | null;
  priority_id: string | null;
  priority_color: string | null;
  status: string | null;
  status_id: string | null;
  status_color: string | null;
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
    priorities,
    statuses,
    uberProjects,
    initialParams,
  ] = await Promise.all([
    getCachedProjectsMainData(),
    getTaskStatuses(),
    getPriorities(),
    getStatuses(),
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
          "project_priorities",
          "project_statuses",
        ]}
      />
      <GridTable
        data={data}
        taskStatuses={taskStatuses}
        priorities={priorities}
        statuses={statuses}
        uberProjects={uberProjects}
        initialParams={initialParams}
      />
    </>
  );
}
