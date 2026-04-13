"use client";

import { useState, useEffect } from "react";

export interface ViewParams {
  columnWidths: Record<string, number>;
}

export interface View {
  id: string;
  name: string;
  params: ViewParams;
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useTableViews(
  storageKey: string,
  defaultWidths: Record<string, number>
) {
  const VIEWS_KEY = `table-views:${storageKey}`;
  const ACTIVE_KEY = `table-views:${storageKey}:active`;

  const defaultParams = (): ViewParams => ({
    columnWidths: { ...defaultWidths },
  });

  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [params, setParams] = useState<ViewParams>(defaultParams());
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
  }, [params, hydrated, activeViewId, VIEWS_KEY]);

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
  };
}
