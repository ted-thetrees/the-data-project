"use client";

import { useState, useEffect } from "react";

export interface ViewParams {
  columnWidths: Record<string, number>;
  // Persisted column order for reorderable (ungrouped) columns. Undefined on
  // legacy saved views — consumers fall back to their declared default order.
  // Keys not present in the array are appended to the end of the rendered set,
  // which handles schema additions without wiping user preferences.
  columnOrder?: string[];
  // Ordered list of column keys to group rows by. Outermost group first.
  // Undefined / empty = no grouping.
  groupBy?: string[];
}

export interface View {
  id: string;
  name: string;
  params: ViewParams;
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

const COOKIE_PREFIX = "tv-";

function writeCookie(storageKey: string, params: ViewParams) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(params));
  // 1 year, path-wide, lax same-site. Synced to the server so SSR can pre-
  // render the correct col widths and avoid the hydration flicker.
  document.cookie = `${COOKIE_PREFIX}${storageKey}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function useTableViews(
  storageKey: string,
  defaultWidths: Record<string, number>,
  initialParams?: ViewParams,
) {
  const VIEWS_KEY = `table-views:${storageKey}`;
  const ACTIVE_KEY = `table-views:${storageKey}:active`;

  const defaultParams = (): ViewParams => ({
    columnWidths: { ...defaultWidths },
  });

  const firstParams: ViewParams = initialParams
    ? {
        columnWidths: { ...defaultWidths, ...initialParams.columnWidths },
        columnOrder: initialParams.columnOrder,
        groupBy: initialParams.groupBy,
      }
    : defaultParams();

  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [params, setParams] = useState<ViewParams>(firstParams);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let loadedViews: View[] = [];
    try {
      const raw = window.localStorage.getItem(VIEWS_KEY);
      if (raw) {
        loadedViews = (JSON.parse(raw) as View[]).map((v) => ({
          ...v,
          params: {
            ...v.params,
            columnWidths: { ...defaultWidths, ...v.params.columnWidths },
          },
        }));
      }
    } catch {
      loadedViews = [];
    }

    let loadedActiveId = window.localStorage.getItem(ACTIVE_KEY);

    if (loadedViews.length === 0) {
      const def: View = {
        id: createId(),
        name: "Default",
        params: defaultParams(),
      };
      loadedViews = [def];
      loadedActiveId = def.id;
      window.localStorage.setItem(VIEWS_KEY, JSON.stringify(loadedViews));
      window.localStorage.setItem(ACTIVE_KEY, loadedActiveId);
    }

    setViews(loadedViews);
    setActiveViewId(loadedActiveId ?? loadedViews[0].id);
    const active =
      loadedViews.find((v) => v.id === loadedActiveId) ?? loadedViews[0];
    setParams(active.params);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || !activeViewId) return;
    setViews((prev) => {
      const next = prev.map((v) =>
        v.id === activeViewId ? { ...v, params } : v
      );
      window.localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
      return next;
    });
    // Persist to cookie as well so the server can SSR with the right widths
    // on the next request.
    writeCookie(storageKey, params);
  }, [params, hydrated, activeViewId, VIEWS_KEY, storageKey]);

  // One-shot migration: if the server didn't receive a cookie for this table
  // but localStorage has saved widths, seed the cookie immediately so the
  // next SSR is flicker-free.
  useEffect(() => {
    if (!hydrated || typeof document === "undefined") return;
    const cookieName = `${COOKIE_PREFIX}${storageKey}=`;
    const hasCookie = document.cookie.split("; ").some((c) =>
      c.startsWith(cookieName),
    );
    if (!hasCookie) writeCookie(storageKey, params);
  }, [hydrated, storageKey, params]);

  const switchView = (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    setActiveViewId(id);
    setParams(v.params);
    window.localStorage.setItem(ACTIVE_KEY, id);
  };

  const createView = () => {
    const name = window.prompt("New view name?");
    if (!name) return;
    const newView: View = { id: createId(), name, params };
    const next = [...views, newView];
    setViews(next);
    setActiveViewId(newView.id);
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    window.localStorage.setItem(ACTIVE_KEY, newView.id);
  };

  const renameView = () => {
    if (!activeViewId) return;
    const current = views.find((v) => v.id === activeViewId);
    if (!current) return;
    const name = window.prompt("Rename view to:", current.name);
    if (!name) return;
    const next = views.map((v) =>
      v.id === activeViewId ? { ...v, name } : v
    );
    setViews(next);
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
  };

  const deleteView = () => {
    if (views.length <= 1 || !activeViewId) return;
    if (!window.confirm("Delete this view?")) return;
    const next = views.filter((v) => v.id !== activeViewId);
    const newActive = next[0];
    setViews(next);
    setActiveViewId(newActive.id);
    setParams(newActive.params);
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    window.localStorage.setItem(ACTIVE_KEY, newActive.id);
  };

  const setColumnWidth = (col: string, w: number) => {
    setParams((p) => ({
      ...p,
      columnWidths: { ...p.columnWidths, [col]: w },
    }));
  };

  const setColumnWidths = (widths: Record<string, number>) => {
    if (Object.keys(widths).length === 0) return;
    setParams((p) => ({
      ...p,
      columnWidths: { ...p.columnWidths, ...widths },
    }));
  };

  const setColumnOrder = (keys: string[]) => {
    setParams((p) => ({ ...p, columnOrder: keys }));
  };

  const setGroupBy = (keys: string[]) => {
    setParams((p) => ({
      ...p,
      groupBy: keys.length === 0 ? undefined : keys,
    }));
  };

  return {
    views,
    activeViewId,
    params,
    hydrated,
    switchView,
    createView,
    renameView,
    deleteView,
    setColumnWidth,
    setColumnWidths,
    setColumnOrder,
    setGroupBy,
  };
}

/**
 * Resolve a stored columnOrder against the set of keys the table currently
 * knows about. Any saved keys that no longer exist are dropped; any current
 * keys missing from the saved order get appended at the end (so schema
 * additions flow in). Returns the authoritative render order. When no order
 * is stored, returns `allKeys` unchanged.
 */
export function resolveColumnOrder(
  stored: string[] | undefined,
  allKeys: readonly string[],
): string[] {
  if (!stored || stored.length === 0) return [...allKeys];
  const allowed = new Set<string>(allKeys);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const key of stored) {
    if (allowed.has(key) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }
  for (const key of allKeys) {
    if (!seen.has(key)) ordered.push(key);
  }
  return ordered;
}
