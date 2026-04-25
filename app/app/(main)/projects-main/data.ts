import { poolV002 } from "@/lib/db";
import type { TaskRow, StatusOption } from "./page";

export async function getProjectsMainData(): Promise<TaskRow[]> {
  const result = await poolV002.query(`
    SELECT t.id, t.name as task, t.result, t.notes as task_notes, t."order" as task_order,
           t.status_id as task_status_id,
           ts.name as task_status, ts.color as task_color,
           p.id as project_id,
           p.name as project, p.tickle_date::text, p.notes as project_notes, p."order" as project_order,
           p.priority_id,
           pri.name as priority, pri.color as priority_color,
           p.status_id,
           st.name as status, st.color as status_color,
           up.id as uber_project_id,
           up.name as uber_project, up."order" as uber_order,
           up.color as uber_color
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN uber_projects up ON p.uber_project_id = up.id
    JOIN task_statuses ts ON t.status_id = ts.id
    LEFT JOIN project_priorities pri ON p.priority_id = pri.id
    LEFT JOIN project_statuses st ON p.status_id = st.id
    WHERE t.deleted_at IS NULL
    ORDER BY
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
    `SELECT id, name, color FROM task_statuses ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

export async function getPriorities(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_priorities ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

export async function getStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_statuses ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

export async function getUberProjects(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM uber_projects ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}
