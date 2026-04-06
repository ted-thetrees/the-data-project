"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableViewMenu } from "@/components/niko-table/components/data-table-view-menu";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import {
  ColContext, FlexBody,
  SortToolbar, GroupingToolbar, SavedViewsToolbar, ColumnOrderToolbar,
  loadViewState, saveViewState, loadSavedViews, saveNamedView, deleteNamedView,
  dataGridStyles, ROW_HEIGHT,
  type ColConfig, type GroupableField, type SavedView, type PicklistColorMap,
} from "@/components/data-grid";
import { updatePersonField, createPerson } from "./actions";
import type { PersonRow, PicklistColorMap as PagePicklistColorMap } from "./page";

// --- Column config (built dynamically from Teable field options) ---

const FIELD_NAME_TO_KEY: Record<string, string> = {
  Familiarity: "familiarity",
  Gender: "gender",
  Has_Org_Filled: "has_org_filled",
  Target_Desirability: "target_desirability",
  Teller_Status: "teller_status",
};

function buildColConfig(fieldOptions: Record<string, string[]>): ColConfig[] {
  const opts = (teableName: string) => fieldOptions[teableName] || [];
  return [
    { key: "name", label: "Name", type: "text", width: 200, fontWeight: 500 },
    { key: "image", label: "Photo", type: "image", width: ROW_HEIGHT },
    { key: "familiarity", label: "Familiarity", type: "select", width: 160, options: opts("Familiarity") },
    { key: "gender", label: "Gender", type: "select", width: 80, options: opts("Gender") },
    { key: "known_as", label: "Known As", type: "text", width: 140 },
    { key: "metro_area", label: "Metro Area", type: "text", width: 180 },
    { key: "has_org_filled", label: "Org Filled", type: "select", width: 120, options: opts("Has Org Filled") },
    { key: "target_desirability", label: "Desirability", type: "select", width: 140, options: opts("Target Desirability") },
    { key: "teller_status", label: "Teller Status", type: "select", width: 180, options: opts("Teller Status") },
    { key: "created_date", label: "Created", type: "date", width: 170 },
  ];
}

const GROUPABLE_FIELDS: GroupableField[] = [
  { key: "familiarity", label: "Familiarity" },
  { key: "gender", label: "Gender" },
  { key: "metro_area", label: "Metro Area" },
  { key: "has_org_filled", label: "Org Filled" },
  { key: "target_desirability", label: "Desirability" },
  { key: "teller_status", label: "Teller Status" },
];

const STATE_KEY = "People-v3";
const VIEWS_KEY = "People-v3:views";

function buildColumns(colConfig: ColConfig[]): ColumnDef<PersonRow>[] {
  return colConfig.map((col) => ({
    accessorKey: col.key,
    header: col.label,
    enableSorting: col.type !== "image",
  }));
}

function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<PersonRow>();
  const filtered = table.getRowModel().rows.length;
  return <span style={{ fontSize: "var(--record-count-font-size)", color: "var(--record-count-color)" }}>{filtered === total ? `${total} records` : `${filtered} of ${total}`}</span>;
}

// --- Main component ---

export function PeopleTable({ data, picklistColors, fieldOptions = {} }: { data: PersonRow[]; picklistColors?: PagePicklistColorMap; fieldOptions?: Record<string, string[]> }) {
  const COL_CONFIG = buildColConfig(fieldOptions);
  const columns = buildColumns(COL_CONFIG);
  const [widths, setWidths] = useState(COL_CONFIG.map((c) => c.width));
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupSortDirs, setGroupSortDirs] = useState<("asc" | "desc")[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onResize = useCallback((i: number, delta: number) => {
    setWidths((prev) => { const next = [...prev]; next[i] = Math.max(60, next[i] + delta); return next; });
  }, []);

  const filteredCols = COL_CONFIG.filter((col) => columnVisibility[col.key] !== false);
  const visibleCols = columnOrder.length > 0
    ? columnOrder.map((key) => filteredCols.find((c) => c.key === key)).filter(Boolean) as ColConfig[]
    : filteredCols;
  const orderedKeys = new Set(columnOrder);
  const extraCols = filteredCols.filter((c) => columnOrder.length > 0 && !orderedKeys.has(c.key));
  const allVisibleCols = [...visibleCols, ...extraCols];

  const visibleWidths = allVisibleCols.map((col) => {
    const origIdx = COL_CONFIG.findIndex((c) => c.key === col.key);
    return widths[origIdx];
  });

  // Load state + views
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
      }
      setSavedViews(views);
      setLoaded(true);
    });
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveViewState(STATE_KEY, {
        widths, sorting, columnVisibility, columnOrder, globalFilter,
        groupFields, groupSortDirs, openGroups: [...openGroups], rowOrder,
      });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loaded, widths, sorting, columnVisibility, columnOrder, globalFilter, groupFields, groupSortDirs, openGroups, rowOrder]);

  const handleGlobalFilterChange = useCallback((value: string | Record<string, unknown>) => {
    setGlobalFilter(typeof value === "string" ? value : String(value.query ?? ""));
  }, []);

  // Grouping handlers
  const addGroup = (f: string) => { if (f && !groupFields.includes(f)) { setGroupFields([...groupFields, f]); setGroupSortDirs([...groupSortDirs, "asc"]); setOpenGroups(new Set()); } };
  const removeGroup = (i: number) => { setGroupFields(groupFields.filter((_, j) => j !== i)); setGroupSortDirs(groupSortDirs.filter((_, j) => j !== i)); setOpenGroups(new Set()); };
  const updateGroup = (i: number, f: string) => { const next = [...groupFields]; next[i] = f; setGroupFields(next); setOpenGroups(new Set()); };
  const toggleGroupSort = (i: number) => { setGroupSortDirs((prev) => { const next = [...prev]; next[i] = next[i] === "asc" ? "desc" : "asc"; return next; }); };
  const toggleGroup = (key: string) => { setOpenGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); };

  const expandAll = () => {
    const keys = new Set<string>();
    function collect(rows: PersonRow[], fields: string[], depth: number) {
      if (fields.length === 0) return;
      const [field, ...rest] = fields;
      const map = new Map<string, PersonRow[]>();
      for (const r of rows) { const k = (r[field as keyof PersonRow] as string) || ""; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
      for (const [label, members] of map) { keys.add(`${depth}-${field}-${label}`); collect(members, rest, depth + 1); }
    }
    collect(data, groupFields, 0);
    setOpenGroups(keys);
  };

  // Saved views
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
              onDirToggle={() => setSorting([{ id: sorting[0]?.id || "name", desc: !sorting[0]?.desc }])}
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

          <ColContext.Provider value={{ widths: visibleWidths, onResize }}>
            <FlexBody<PersonRow>
              visibleCols={allVisibleCols} groupFields={groupFields} groupSortDirs={groupSortDirs}
              openGroups={openGroups} toggleGroup={toggleGroup}
              onUpdate={(id, field, value) => updatePersonField(id, field, value)}
              picklistColors={picklistColors}
              onCreate={(fields) => createPerson(fields)}
              sorting={sorting} rowOrder={rowOrder} onReorder={setRowOrder}
            />
          </ColContext.Provider>
        </DataTableRoot>
      </div>
      <style>{dataGridStyles}</style>
    </div>
  );
}
