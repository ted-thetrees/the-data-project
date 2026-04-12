import { poolV002 } from "@/lib/db";
import { ProjectsTable } from "./projects-table";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export interface TaskRow {
  id: string;
  task: string;
  task_status: string;
  task_color: string;
  task_order: number | null;
  result: string | null;
  task_notes: string | null;
  project: string;
  project_status: string;
  project_color: string;
  project_order: number | null;
  tickle_date: string | null;
  project_notes: string | null;
  uber_project: string;
  uber_order: number | null;
}

async function getData(): Promise<TaskRow[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name as task, t.result, t.notes as task_notes, t."order" as task_order,
           ts.name as task_status, ts.color as task_color,
           p.name as project, p.tickle_date::text, p.notes as project_notes, p."order" as project_order,
           ps.name as project_status, ps.color as project_color,
           up.name as uber_project, up."order" as uber_order
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN project_statuses ps ON p.status_id = ps.id
    JOIN uber_projects up ON p.uber_project_id = up.id
    JOIN task_statuses ts ON t.status_id = ts.id
    WHERE ps.name = 'Active'
    ORDER BY up."order" NULLS LAST, up.name,
             p."order" NULLS LAST, p.name,
             t."order" NULLS LAST, t.name
  `);
  return result.rows;
}

export default async function ProjectsPage() {
  const data = await getData();
  return <ProjectsTable data={data} />;
}
