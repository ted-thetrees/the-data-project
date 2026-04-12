import { poolV002 } from "@/lib/db";
import { GridTable } from "./grid-table";

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
}

export interface StatusOption {
  id: string;
  name: string;
  color: string | null;
}

async function getData(): Promise<TaskRow[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name as task, t.result, t.notes as task_notes, t."order" as task_order,
           t.status_id as task_status_id,
           ts.name as task_status, ts.color as task_color,
           p.id as project_id,
           p.status_id as project_status_id,
           p.name as project, p.tickle_date::text, p.notes as project_notes, p."order" as project_order,
           p.is_draft as project_is_draft,
           ps.name as project_status, ps.color as project_color,
           up.id as uber_project_id,
           up.name as uber_project, up."order" as uber_order
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN project_statuses ps ON p.status_id = ps.id
    JOIN uber_projects up ON p.uber_project_id = up.id
    JOIN task_statuses ts ON t.status_id = ts.id
    WHERE ps.name = 'Active'
    ORDER BY
      CASE WHEN p.is_draft THEN 0 ELSE 1 END,
      p.tickle_date ASC NULLS LAST, p.name,
             CASE ts.name
               WHEN 'Tickled' THEN 1
               WHEN 'Done' THEN 2
               WHEN 'Abandoned' THEN 3
               ELSE 99
             END,
             t."order" NULLS LAST, t.name
  `);
  return result.rows;
}

async function getTaskStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM task_statuses ORDER BY name`
  );
  return result.rows;
}

async function getProjectStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_statuses ORDER BY name`
  );
  return result.rows;
}

export default async function GridPage() {
  const [data, taskStatuses, projectStatuses] = await Promise.all([
    getData(),
    getTaskStatuses(),
    getProjectStatuses(),
  ]);
  return (
    <GridTable
      data={data}
      taskStatuses={taskStatuses}
      projectStatuses={projectStatuses}
    />
  );
}
