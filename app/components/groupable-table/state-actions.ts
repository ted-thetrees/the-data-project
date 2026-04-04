"use server";

import { pool } from "@/lib/db";

const USER_ID = "ted";

export async function loadTableState(tableName: string) {
  const result = await pool.query(
    `SELECT state FROM public.ui_state WHERE user_id = $1 AND table_name = $2`,
    [USER_ID, tableName]
  );
  return result.rows[0]?.state || null;
}

export async function saveTableState(tableName: string, state: Record<string, unknown>) {
  await pool.query(
    `INSERT INTO public.ui_state (user_id, table_name, state, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, table_name)
     DO UPDATE SET state = $3, updated_at = NOW()`,
    [USER_ID, tableName, JSON.stringify(state)]
  );
}
