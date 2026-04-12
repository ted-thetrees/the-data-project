import { GridTable } from "./grid-table";
import { Realtime } from "@/components/realtime";
import {
  getProjectsMainData,
  getTaskStatuses,
  getProjectStatuses,
  getUberProjects,
} from "./data";

export const metadata = { title: "Projects | Main" };
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
  project_is_draft: boolean;
  tickle_date: string | null;
  project_notes: string | null;
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
  const [data, taskStatuses, projectStatuses, uberProjects] = await Promise.all([
    getProjectsMainData(),
    getTaskStatuses(),
    getProjectStatuses(),
    getUberProjects(),
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
        ]}
      />
      <GridTable
        data={data}
        taskStatuses={taskStatuses}
        projectStatuses={projectStatuses}
        uberProjects={uberProjects}
      />
    </>
  );
}
