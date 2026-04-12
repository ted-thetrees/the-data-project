import { poolV002 } from "@/lib/db";
import type { TaskRow, StatusOption } from "./page";

export async function getProjectsMainData(): Promise<TaskRow[]> {
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
           up.name as uber_project, up."order" as uber_order,
           up.color as uber_color
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

export async function getTaskStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM task_statuses ORDER BY name`
  );
  return result.rows;
}

export async function getProjectStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_statuses ORDER BY name`
  );
  return result.rows;
}

export async function getUberProjects(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM uber_projects ORDER BY name`
  );
  return result.rows;
}
