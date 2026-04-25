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
           p.action_order_status_id,
           aos.name as action_order_status, aos.color as action_order_color,
           p.entry_status_id,
           pes.name as entry_status, pes.color as entry_status_color,
           ps.name as project_status, ps.color as project_color,
           up.id as uber_project_id,
           up.name as uber_project, up."order" as uber_order,
           up.color as uber_color
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN project_statuses ps ON p.status_id = ps.id
    JOIN uber_projects up ON p.uber_project_id = up.id
    JOIN task_statuses ts ON t.status_id = ts.id
    LEFT JOIN project_action_order_statuses aos ON p.action_order_status_id = aos.id
    LEFT JOIN project_entry_statuses pes ON p.entry_status_id = pes.id
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

export async function getProjectStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_statuses ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

export async function getActionOrderStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_action_order_statuses ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

export async function getEntryStatuses(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM project_entry_statuses ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}

export async function getUberProjects(): Promise<StatusOption[]> {
  const result = await poolV002.query(
    `SELECT id, name, color FROM uber_projects ORDER BY sort_order NULLS LAST, name`
  );
  return result.rows;
}
