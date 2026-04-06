"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableViewMenu } from "@/components/niko-table/components/data-table-view-menu";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import {
  ColContext, FlexBody,
  SortToolbar, GroupingToolbar, SavedViewsToolbar, ColumnOrderToolbar, FilterToolbar,
  loadViewState, saveViewState, loadSavedViews, saveNamedView, deleteNamedView,
  dataGridStyles, ROW_HEIGHT,
  type ColConfig, type GroupableField, type SavedView, type PicklistColorMap, type ColumnFilter,
} from "@/components/data-grid";
import { updatePersonField, createPerson } from "./actions";
import type { TeableFieldSchema } from "@/lib/db";
import type { PicklistColorMap as PagePicklistColorMap } from "./page";

type Row = Record<string, unknown> & { id: string };

// --- Build ColConfig from Teable schema ---

const DEFAULT_WIDTHS: Record<string, number> = {
  singleLineText: 180,
  singleSelect: 160,
  attachment: ROW_HEIGHT,
  date: 170,
};

function schemaToColConfig(schema: TeableFieldSchema[]): ColConfig[] {
  return schema.map((field) => {
    const key = field.dbFieldName.toLowerCase();
    const type: ColConfig["type"] =
      field.type === "singleSelect" ? "select" :
      field.type === "attachment" ? "image" :
      field.type === "date" ? "date" : "text";
    return {
      key,
      label: field.name,
      type,
      width: DEFAULT_WIDTHS[field.type] || 160,
      options: field.options,
      ...(field.isPrimary ? { fontWeight: 500 } : {}),
    };
  });
}

function schemaToGroupableFields(schema: TeableFieldSchema[]): GroupableField[] {
  return schema
    .filter((f) => f.type === "singleSelect" || f.type === "singleLineText")
    .filter((f) => f.type !== "singleLineText" || !f.isPrimary) // skip primary text field
    .map((f) => ({ key: f.dbFieldName.toLowerCase(), label: f.name }));
}

const STATE_KEY = "People-v3";
const VIEWS_KEY = "People-v3:views";

function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<Row>();
  const filtered = table.getRowModel().rows.length;
  return <span style={{ fontSize: "var(--record-count-font-size)", color: "var(--record-count-color)" }}>{filtered === total ? `${total} records` : `${filtered} of ${total}`}</span>;
}

// --- Main component ---

export function PeopleTable({ data, schema, picklistColors }: { data: Row[]; schema: TeableFieldSchema[]; picklistColors?: PagePicklistColorMap }) {
  const COL_CONFIG = useMemo(() => schemaToColConfig(schema), [schema]);
  const GROUPABLE_FIELDS = useMemo(() => schemaToGroupableFields(schema), [schema]);
  const columns = useMemo<ColumnDef<Row>[]>(() =>
    COL_CONFIG.map((col) => ({
      accessorKey: col.key,
      header: col.label,
      enableSorting: col.type !== "image",
    })),
  [COL_CONFIG]);

  const [widths, setWidths] = useState(COL_CONFIG.map((c) => c.width));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupSortDirs, setGroupSortDirs] = useState<("asc" | "desc")[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredCols = COL_CONFIG.filter((col) => columnVisibility[col.key] !== false);
  const visibleCols = columnOrder.length > 0
    ? columnOrder.map((key) => filteredCols.find((c) => c.key === key)).filter(Boolean) as ColConfig[]
    : filteredCols;
  const orderedKeys = new Set(columnOrder);
  const extraCols = filteredCols.filter((c) => columnOrder.length > 0 && !orderedKeys.has(c.key));
  const allVisibleCols = [...visibleCols, ...extraCols];

  const onResize = useCallback((visibleIdx: number, delta: number) => {
    const col = allVisibleCols[visibleIdx];
    if (!col) return;
    const origIdx = COL_CONFIG.findIndex((c) => c.key === col.key);
    if (origIdx === -1) return;
    setWidths((prev) => { const next = [...prev]; next[origIdx] = Math.max(60, next[origIdx] + delta); return next; });
  }, [allVisibleCols, COL_CONFIG]);

  const visibleWidths = allVisibleCols.map((col) => {
    const origIdx = COL_CONFIG.findIndex((c) => c.key === col.key);
    return widths[origIdx];
  });

  useEffect(() => {
    Promise.all([loadViewState(STATE_KEY), loadSavedViews(VIEWS_KEY)]).then(([state, views]) => {
      if (state) {
        if (state.widths) setWidths(state.widths as number[]);
        if (state.sorting) setSorting(state.sorting as SortingState);
        if (state.columnVisibility) setColumnVisibility(state.columnVisibility as VisibilityState);
        if (state.globalFilter) setGlobalFilter(state.globalFilter as string);
        if (state.columnOrder) setColumnOrder(state.columnOrder as string[]);
        if (state.groupFields) setGroupFields(state.groupFields as string[]);
        if (state.groupSortDirs) setGroupSortDirs(state.groupSortDirs as ("asc" | "desc")[]);
        if (state.openGroups) setOpenGroups(new Set(state.openGroups as string[]));
        if (state.rowOrder) setRowOrder(state.rowOrder as string[]);
        if (state.columnFilters) setColumnFilters(state.columnFilters as Record<string, ColumnFilter>);
      }
      setSavedViews(views);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveViewState(STATE_KEY, {
        widths, sorting, columnVisibility, columnOrder, globalFilter,
        groupFields, groupSortDirs, openGroups: [...openGroups], rowOrder, columnFilters,
      });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loaded, widths, sorting, columnVisibility, columnOrder, globalFilter, groupFields, groupSortDirs, openGroups, rowOrder, columnFilters]);

  const handleGlobalFilterChange = useCallback((value: string | Record<string, unknown>) => {
    setGlobalFilter(typeof value === "string" ? value : String(value.query ?? ""));
  }, []);

  const addGroup = (f: string) => { if (f && !groupFields.includes(f)) { setGroupFields([...groupFields, f]); setGroupSortDirs([...groupSortDirs, "asc"]); setOpenGroups(new Set()); } };
  const removeGroup = (i: number) => { setGroupFields(groupFields.filter((_, j) => j !== i)); setGroupSortDirs(groupSortDirs.filter((_, j) => j !== i)); setOpenGroups(new Set()); };
  const updateGroup = (i: number, f: string) => { const next = [...groupFields]; next[i] = f; setGroupFields(next); setOpenGroups(new Set()); };
  const toggleGroupSort = (i: number) => { setGroupSortDirs((prev) => { const next = [...prev]; next[i] = next[i] === "asc" ? "desc" : "asc"; return next; }); };
  const toggleGroup = (key: string) => { setOpenGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); };

  const expandAll = () => {
    const keys = new Set<string>();
    function collect(rows: Row[], fields: string[], depth: number) {
      if (fields.length === 0) return;
      const [field, ...rest] = fields;
      const map = new Map<string, Row[]>();
      for (const r of rows) { const k = (r[field] as string) || ""; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
      for (const [label, members] of map) { keys.add(`${depth}-${field}-${label}`); collect(members, rest, depth + 1); }
    }
    collect(data, groupFields, 0);
    setOpenGroups(keys);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view: SavedView = { name: viewName.trim(), sorting, grouping: groupFields, groupSortDirs, columnVisibility, columnOrder, globalFilter };
    saveNamedView(VIEWS_KEY, view).then(() => loadSavedViews(VIEWS_KEY).then(setSavedViews));
    setViewName("");
  };
  const handleLoadView = (view: SavedView) => {
    setSorting(view.sorting); setGroupFields(view.grouping); setGroupSortDirs(view.groupSortDirs);
    setColumnVisibility(view.columnVisibility); setColumnOrder(view.columnOrder || []); setGlobalFilter(view.globalFilter); setOpenGroups(new Set());
  };
  const handleDeleteView = (name: string) => {
    deleteNamedView(VIEWS_KEY, name).then(() => loadSavedViews(VIEWS_KEY).then(setSavedViews));
  };

  const sortableFields = COL_CONFIG.filter((c) => c.type !== "image").map((c) => ({ key: c.key, label: c.label }));
  const primaryKey = COL_CONFIG.find((c) => c.fontWeight)?.key || COL_CONFIG[0]?.key || "name";

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: "100%", padding: "var(--page-padding-y) var(--page-padding-x)" }}>
        <DataTableRoot
          data={data}
          columns={columns}
          getRowId={(row) => row.id}
          state={{ sorting, columnVisibility, globalFilter }}
          onSortingChange={setSorting}
          onColumnVisibilityChange={setColumnVisibility}
          onGlobalFilterChange={handleGlobalFilterChange}
          config={{ enableSorting: true, enableFilters: true, enablePagination: false }}
        >
          <DataTableToolbarSection>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: "var(--title-font-size)", fontWeight: "var(--title-font-weight)" as unknown as number, margin: 0, letterSpacing: "var(--title-letter-spacing)", color: "var(--title-color)" }}>People</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search people..." />
                <DataTableViewMenu />
                <RecordCount total={data.length} />
              </div>
            </div>
          </DataTableToolbarSection>

          <div style={{
            display: "flex", alignItems: "center", gap: "var(--toolbar-gap)", flexWrap: "wrap",
            padding: "var(--toolbar-padding-y) var(--toolbar-padding-x)",
            background: "var(--toolbar-bg)", border: `var(--border-width) solid var(--toolbar-border)`,
            borderRadius: "var(--radius)", fontSize: "var(--toolbar-font-size)",
          }}>
            <SortToolbar sorting={sorting} sortableFields={sortableFields}
              onSortChange={(f) => f ? setSorting([{ id: f, desc: sorting[0]?.desc || false }]) : setSorting([])}
              onDirToggle={() => setSorting([{ id: sorting[0]?.id || primaryKey, desc: !sorting[0]?.desc }])}
              onClearSort={() => setSorting([])} />
            <div style={{ width: "var(--divider-width)", height: "var(--divider-height)", background: "var(--divider-color)" }} />
            <GroupingToolbar groupFields={groupFields} groupSortDirs={groupSortDirs} groupableFields={GROUPABLE_FIELDS}
              onAddGroup={addGroup} onRemoveGroup={removeGroup} onUpdateGroup={updateGroup}
              onToggleGroupSort={toggleGroupSort} onExpandAll={expandAll} onCollapseAll={() => setOpenGroups(new Set())} />
            <div style={{ width: "var(--divider-width)", height: "var(--divider-height)", background: "var(--divider-color)" }} />
            <ColumnOrderToolbar columns={COL_CONFIG} columnOrder={columnOrder} onReorder={setColumnOrder} />
            <div style={{ width: "var(--divider-width)", height: "var(--divider-height)", background: "var(--divider-color)" }} />
            <SavedViewsToolbar views={savedViews} onLoad={handleLoadView} onSave={handleSaveView}
              onDelete={handleDeleteView} currentViewName={viewName} onSetName={setViewName} />
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: "var(--toolbar-gap)", flexWrap: "wrap",
            padding: "var(--toolbar-padding-y) var(--toolbar-padding-x)",
            background: "var(--toolbar-bg)", border: `var(--border-width) solid var(--toolbar-border)`,
            borderTop: "none", borderRadius: `0 0 var(--radius) var(--radius)`,
            fontSize: "var(--toolbar-font-size)",
          }}>
            <FilterToolbar columns={COL_CONFIG} data={data as unknown as Record<string, unknown>[]} columnFilters={columnFilters} onColumnFiltersChange={setColumnFilters} />
          </div>

          <ColContext.Provider value={{ widths: visibleWidths, onResize }}>
            <FlexBody<Row>
              visibleCols={allVisibleCols} groupFields={groupFields} groupSortDirs={groupSortDirs}
              openGroups={openGroups} toggleGroup={toggleGroup}
              onUpdate={(id, field, value) => updatePersonField(id, field, value)}
              picklistColors={picklistColors}
              onCreate={(fields) => createPerson(fields)}
              sorting={sorting} rowOrder={rowOrder} onReorder={setRowOrder}
              columnFilters={columnFilters}
            />
          </ColContext.Provider>
        </DataTableRoot>
      </div>
      <style>{dataGridStyles}</style>
    </div>
  );
}
