"use server";

import { pool } from "@/lib/db";

const USER_ID = "ted";

export interface SavedView {
  name: string;
  sorting: { id: string; desc: boolean }[];
  grouping: string[];
  groupSortDirs: ("asc" | "desc")[];
  columnVisibility: Record<string, boolean>;
  globalFilter: string;
}

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

export async function loadSavedViews(): Promise<SavedView[]> {
  const result = await pool.query(
    `SELECT state FROM public.ui_state WHERE user_id = $1 AND table_name = $2`,
    [USER_ID, "People-v2:views"]
  );
  return (result.rows[0]?.state as SavedView[]) || [];
}

export async function saveNamedView(view: SavedView) {
  const views = await loadSavedViews();
  const existing = views.findIndex((v) => v.name === view.name);
  if (existing >= 0) {
    views[existing] = view;
  } else {
    views.push(view);
  }
  await saveViewState("People-v2:views", views as unknown as Record<string, unknown>);
}

export async function deleteNamedView(name: string) {
  const views = await loadSavedViews();
  const filtered = views.filter((v) => v.name !== name);
  await saveViewState("People-v2:views", filtered as unknown as Record<string, unknown>);
}
