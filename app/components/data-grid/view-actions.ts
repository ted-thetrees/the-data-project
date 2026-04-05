"use server";

import { pool } from "@/lib/db";
import type { SavedView } from "./types";

const USER_ID = "ted";

export async function loadViewState(key: string) {
  const result = await pool.query(
    `SELECT state FROM public.ui_state WHERE user_id = $1 AND table_name = $2`,
    [USER_ID, key]
  );
  return result.rows[0]?.state || null;
}

export async function saveViewState(key: string, state: Record<string, unknown>) {
  await pool.query(
    `INSERT INTO public.ui_state (user_id, table_name, state, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, table_name)
     DO UPDATE SET state = $3, updated_at = NOW()`,
    [USER_ID, key, JSON.stringify(state)]
  );
}

export async function loadSavedViews(viewsKey: string): Promise<SavedView[]> {
  const result = await pool.query(
    `SELECT state FROM public.ui_state WHERE user_id = $1 AND table_name = $2`,
    [USER_ID, viewsKey]
  );
  return (result.rows[0]?.state as SavedView[]) || [];
}

export async function saveNamedView(viewsKey: string, view: SavedView) {
  const views = await loadSavedViews(viewsKey);
  const existing = views.findIndex((v) => v.name === view.name);
  if (existing >= 0) views[existing] = view; else views.push(view);
  await saveViewState(viewsKey, views as unknown as Record<string, unknown>);
}

export async function deleteNamedView(viewsKey: string, name: string) {
  const views = await loadSavedViews(viewsKey);
  await saveViewState(viewsKey, views.filter((v) => v.name !== name) as unknown as Record<string, unknown>);
}
