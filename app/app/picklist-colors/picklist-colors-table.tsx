"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
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
  dataGridStyles, ROW_HEIGHT, contrastText,
  type ColConfig, type GroupableField, type SavedView,
} from "@/components/data-grid";
import { updatePicklistColor } from "./actions";
import type { PicklistColorRow } from "./page";

// --- Picklist color palette ---

const PAIRED_COLORS = [
  { name: "Coral", hex: "#fbb4ae" },
  { name: "Peach", hex: "#fdcdac" },
  { name: "Apricot", hex: "#fed9a6" },
  { name: "Cream", hex: "#fff2ae" },
  { name: "Butter", hex: "#ffffb3" },
  { name: "Champagne", hex: "#f1e2cc" },
  { name: "Tan", hex: "#e5d8bd" },
  { name: "Lime", hex: "#e6f5c9" },
  { name: "Mint", hex: "#ccebc5" },
  { name: "Green", hex: "#b3e2cd" },
  { name: "Sky", hex: "#b3cde3" },
  { name: "Periwinkle", hex: "#cbd5e8" },
  { name: "Lavender", hex: "#decbe4" },
  { name: "Pink", hex: "#fddaec" },
  { name: "Silver", hex: "#f2f2f2" },
  { name: "Gray", hex: "#d9d9d9" },
];

// --- Color swatch picker ---

function ColorPicker({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentColor = PAIRED_COLORS.find((c) => c.hex === value);

  return (
    <div ref={ref} style={{ position: "relative", overflow: open ? "visible" : undefined }}>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "2px 4px", margin: "-2px -4px", borderRadius: "var(--radius-sm)", opacity: isPending ? "var(--pending-opacity)" : 1 }}
        className="gt-editable"
      >
        <div style={{
          width: 24, height: 24, borderRadius: "var(--radius-sm)", flexShrink: 0,
          background: value || "transparent", border: "var(--border-width) solid var(--border)",
        }} />
        <span style={{ fontSize: "var(--font-size-sm)" }}>{currentColor?.name || value || "—"}</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 10, marginLeft: "auto" }}>▿</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: -8, zIndex: 50,
          marginTop: 4, padding: 8,
          background: "var(--dropdown-bg)", border: "var(--border-width) solid var(--dropdown-border)",
          borderRadius: "var(--dropdown-radius)", boxShadow: "var(--dropdown-shadow)",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4,
          width: 160,
        }} onClick={(e) => e.stopPropagation()}>
          {PAIRED_COLORS.map((c) => (
            <div
              key={c.hex}
              onClick={() => { startTransition(() => onSave(c.hex)); setOpen(false); }}
              title={c.name}
              style={{
                width: 32, height: 32, borderRadius: "var(--radius-md)", cursor: "pointer",
                background: c.hex,
                border: value === c.hex ? "2px solid var(--foreground)" : "var(--border-width) solid var(--border)",
                transition: `transform var(--transition-fast)`,
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Column config ---

const COL_CONFIG: ColConfig[] = [
  { key: "table_name", label: "Table", type: "text", width: 120, fontWeight: 600 },
  { key: "field", label: "Field", type: "text", width: 160, fontWeight: 600 },
  { key: "option", label: "Option", type: "text", width: 280 },
  {
    key: "color", label: "Color", type: "custom", width: 200,
    render: (val, row) => (
      <ColorPicker value={(val as string) || ""} onSave={(v) => updatePicklistColor(row.id as string, "color", v)} />
    ),
  },
  {
    key: "preview", label: "Preview", type: "custom", width: 280,
    render: (_val, row) => (
      <div style={{
        background: (row.color as string) || "transparent",
        padding: "4px 12px", borderRadius: "var(--radius-sm)",
        fontSize: "var(--font-size-sm)",
        color: (row.color as string) ? contrastText(row.color as string) : "var(--foreground)",
      }}>
        {row.option as string}
      </div>
    ),
  },
];

const GROUPABLE_FIELDS: GroupableField[] = [
  { key: "table_name", label: "Table" },
  { key: "field", label: "Field" },
];

const STATE_KEY = "PicklistColors";
const VIEWS_KEY = "PicklistColors:views";

function buildColumns(colConfig: ColConfig[]): ColumnDef<PicklistColorRow>[] {
  return colConfig.map((col) => ({
    accessorKey: col.key,
    header: col.label,
    enableSorting: col.type !== "custom",
  }));
}

function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<PicklistColorRow>();
  const filtered = table.getRowModel().rows.length;
  return <span style={{ fontSize: "var(--record-count-font-size)", color: "var(--record-count-color)" }}>{filtered === total ? `${total} mappings` : `${filtered} of ${total}`}</span>;
}

// --- Main component ---

export function PicklistColorsTable({ data }: { data: PicklistColorRow[] }) {
  const columns = buildColumns(COL_CONFIG);
  const [widths, setWidths] = useState(COL_CONFIG.map((c) => c.width));
  const [sorting, setSorting] = useState<SortingState>([{ id: "field", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [groupFields, setGroupFields] = useState<string[]>(["table_name", "field"]);
  const [groupSortDirs, setGroupSortDirs] = useState<("asc" | "desc")[]>(["asc", "asc"]);
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

  const addGroup = (f: string) => { if (f && !groupFields.includes(f)) { setGroupFields([...groupFields, f]); setGroupSortDirs([...groupSortDirs, "asc"]); setOpenGroups(new Set()); } };
  const removeGroup = (i: number) => { setGroupFields(groupFields.filter((_, j) => j !== i)); setGroupSortDirs(groupSortDirs.filter((_, j) => j !== i)); setOpenGroups(new Set()); };
  const updateGroup = (i: number, f: string) => { const next = [...groupFields]; next[i] = f; setGroupFields(next); setOpenGroups(new Set()); };
  const toggleGroupSort = (i: number) => { setGroupSortDirs((prev) => { const next = [...prev]; next[i] = next[i] === "asc" ? "desc" : "asc"; return next; }); };
  const toggleGroup = (key: string) => { setOpenGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); };

  const expandAll = () => {
    const keys = new Set<string>();
    function collect(rows: PicklistColorRow[], fields: string[], depth: number) {
      if (fields.length === 0) return;
      const [field, ...rest] = fields;
      const map = new Map<string, PicklistColorRow[]>();
      for (const r of rows) { const k = (r[field as keyof PicklistColorRow] as string) || ""; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
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

  const sortableFields = COL_CONFIG.filter((c) => c.type !== "custom").map((c) => ({ key: c.key, label: c.label }));

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
              <h1 style={{ fontSize: "var(--title-font-size)", fontWeight: "var(--title-font-weight)" as unknown as number, margin: 0, letterSpacing: "var(--title-letter-spacing)", color: "var(--title-color)" }}>Picklist Colors</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search..." />
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
              onDirToggle={() => setSorting([{ id: sorting[0]?.id || "field", desc: !sorting[0]?.desc }])}
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
            <FlexBody<PicklistColorRow>
              visibleCols={allVisibleCols} groupFields={groupFields} groupSortDirs={groupSortDirs}
              openGroups={openGroups} toggleGroup={toggleGroup}
              onUpdate={(id, field, value) => updatePicklistColor(id, field, value)}
              sorting={sorting} rowOrder={rowOrder} onReorder={setRowOrder}
            />
          </ColContext.Provider>
        </DataTableRoot>
      </div>
      <style>{dataGridStyles}</style>
    </div>
  );
}
