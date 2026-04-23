"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

const TASK_FIELDS = new Set(["name", "status_id", "result", "notes"]);
const PROJECT_FIELDS = new Set([
  "name",
  "tickle_date",
  "notes",
  "status_id",
  "uber_project_id",
  "action_order_status_id",
]);
const UBER_FIELDS = new Set(["name"]);

export async function updateTaskField(
  id: string,
  field: string,
  value: unknown
) {
  if (!TASK_FIELDS.has(field)) throw new Error(`Invalid task field: ${field}`);
  await poolV002.query(`UPDATE tasks SET ${field} = $1 WHERE id = $2`, [
    value,
    id,
  ]);
  revalidatePath("/projects-main");
}

export async function updateProjectField(
  id: string,
  field: string,
  value: unknown
) {
  if (!PROJECT_FIELDS.has(field))
    throw new Error(`Invalid project field: ${field}`);
  await poolV002.query(`UPDATE projects SET ${field} = $1 WHERE id = $2`, [
    value,
    id,
  ]);
  revalidatePath("/projects-main");
}

export async function updateUberField(
  id: string,
  field: string,
  value: unknown
) {
  if (!UBER_FIELDS.has(field)) throw new Error(`Invalid uber field: ${field}`);
  await poolV002.query(
    `UPDATE uber_projects SET ${field} = $1 WHERE id = $2`,
    [value, id]
  );
  revalidatePath("/projects-main");
}

export async function finalizeProject(id: string) {
  await poolV002.query(
    `UPDATE projects SET is_draft = false WHERE id = $1`,
    [id]
  );
  revalidatePath("/projects-main");
}

export async function deleteTask(id: string) {
  await poolV002.query(
    `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  revalidatePath("/projects-main");
}

/**
 * Swap this task's ordering within its project with the nearest sibling in
 * `direction`. Neighboring is defined the way the SQL ORDER BY does it:
 * status bucket (Tickled → Done → Abandoned → other), then `"order"` NULLS
 * LAST, then name. All tasks in the project get a fresh sequential `"order"`
 * so the swap is deterministic even when some rows start with NULL orders.
 */
export async function moveTask(taskId: string, direction: "up" | "down") {
  const client = await poolV002.connect();
  try {
    await client.query("BEGIN");
    const projectRes = await client.query<{ project_id: string }>(
      `SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`,
      [taskId],
    );
    const projectId = projectRes.rows[0]?.project_id;
    if (!projectId) {
      await client.query("ROLLBACK");
      return;
    }

    // Lay out the task ordering the same way the grid renders them, then
    // rewrite `"order"` to the position so any future swap is stable.
    const seqRes = await client.query<{ id: string }>(
      `SELECT t.id
         FROM tasks t
         JOIN task_statuses ts ON t.status_id = ts.id
        WHERE t.project_id = $1 AND t.deleted_at IS NULL
        ORDER BY
          CASE ts.name
            WHEN 'Tickled' THEN 1
            WHEN 'Done' THEN 2
            WHEN 'Abandoned' THEN 3
            ELSE 99
          END,
          t."order" NULLS LAST,
          t.name`,
      [projectId],
    );
    const ids = seqRes.rows.map((r) => r.id);
    const idx = ids.indexOf(taskId);
    const neighbor = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || neighbor < 0 || neighbor >= ids.length) {
      await client.query("ROLLBACK");
      return;
    }
    [ids[idx], ids[neighbor]] = [ids[neighbor], ids[idx]];

    // Persist the new sequence. 10-step gaps leave room for future inserts.
    const values = ids.map((id, i) => `('${id}'::uuid, ${(i + 1) * 10})`).join(",");
    await client.query(
      `UPDATE tasks t SET "order" = v.new_order
         FROM (VALUES ${values}) AS v(id, new_order)
        WHERE t.id = v.id`,
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/projects-main");
}

export async function deleteProject(id: string) {
  const client = await poolV002.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM tasks WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM projects WHERE id = $1`, [id]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/projects-main");
}

export async function createTask(projectId: string) {
  const status = await poolV002.query(
    `SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`
  );
  if (!status.rows[0]) throw new Error("Tickled task status missing");
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ($1, $2, $3)`,
    ["", projectId, status.rows[0].id]
  );
  revalidatePath("/projects-main");
}

export async function createProject() {
  const [projectStatus, taskStatus, uberProject, actionOrder] =
    await Promise.all([
      poolV002.query(`SELECT id FROM project_statuses WHERE name = 'Active' LIMIT 1`),
      poolV002.query(`SELECT id FROM task_statuses WHERE name = 'Tickled' LIMIT 1`),
      poolV002.query(`SELECT id FROM uber_projects ORDER BY name LIMIT 1`),
      poolV002.query(
        `SELECT id FROM project_action_order_statuses
         ORDER BY sort_order NULLS LAST, name LIMIT 1`,
      ),
    ]);
  if (!projectStatus.rows[0]) throw new Error("Active project status missing");
  if (!taskStatus.rows[0]) throw new Error("Tickled task status missing");
  if (!uberProject.rows[0]) throw new Error("No uber projects available");

  const project = await poolV002.query(
    `INSERT INTO projects (name, status_id, uber_project_id, action_order_status_id, is_draft)
     VALUES ('Untitled Project', $1, $2, $3, true)
     RETURNING id`,
    [
      projectStatus.rows[0].id,
      uberProject.rows[0].id,
      actionOrder.rows[0]?.id ?? null,
    ],
  );
  await poolV002.query(
    `INSERT INTO tasks (name, project_id, status_id) VALUES ('', $1, $2)`,
    [project.rows[0].id, taskStatus.rows[0].id],
  );
  revalidatePath("/projects-main");
}
