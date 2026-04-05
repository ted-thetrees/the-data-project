"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import type { ColumnDef, SortingState, VisibilityState, Row } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTable } from "@/components/niko-table/core/data-table";
import { DataTableHeader, DataTableBody } from "@/components/niko-table/core/data-table-structure";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableViewMenu } from "@/components/niko-table/components/data-table-view-menu";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import { updatePicklistColor } from "./actions";
import { loadViewState, saveViewState } from "@/components/data-grid";
import type { PicklistColorRow } from "./page";

const DEPTH_COLORS = [
  "var(--depth-0)", "var(--depth-1)", "var(--depth-2)",
  "var(--depth-3)", "var(--depth-4)",
];

const STATE_KEY = "PicklistColors";

// --- schemePaired palette ---
const PAIRED_COLORS = [
  { name: "Light Blue", hex: "#a6cee3" },
  { name: "Blue", hex: "#1f78b4" },
  { name: "Light Green", hex: "#b2df8a" },
  { name: "Green", hex: "#33a02c" },
  { name: "Light Pink", hex: "#fb9a99" },
  { name: "Red", hex: "#e31a1c" },
  { name: "Light Orange", hex: "#fdbf6f" },
  { name: "Orange", hex: "#ff7f00" },
  { name: "Light Purple", hex: "#cab2d6" },
  { name: "Purple", hex: "#6a3d9a" },
  { name: "Light Yellow", hex: "#ffff99" },
  { name: "Brown", hex: "#b15928" },
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
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "2px 4px", margin: "-2px -4px", borderRadius: 4, opacity: isPending ? 0.5 : 1 }}
        className="color-picker-trigger"
      >
        <div style={{
          width: 24, height: 24, borderRadius: 4, flexShrink: 0,
          background: value || "transparent", border: "1px solid var(--border)",
        }} />
        <span style={{ fontSize: 13 }}>{currentColor?.name || value || "—"}</span>
        <span style={{ color: "var(--muted-foreground)", fontSize: 10, marginLeft: "auto" }}>▿</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: -8, zIndex: 50,
          marginTop: 4, padding: 8,
          background: "var(--background)", border: "1px solid var(--border)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4,
          width: 220,
        }} onClick={(e) => e.stopPropagation()}>
          {PAIRED_COLORS.map((c) => (
            <div
              key={c.hex}
              onClick={() => { startTransition(() => onSave(c.hex)); setOpen(false); }}
              title={c.name}
              style={{
                width: 32, height: 32, borderRadius: 6, cursor: "pointer",
                background: c.hex,
                border: value === c.hex ? "2px solid var(--foreground)" : "1px solid var(--border)",
                transition: "transform 0.1s",
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

// --- Groupable fields ---
const GROUPABLE_FIELDS = [
  { key: "field", label: "Field" },
];

// --- Column definitions ---
const columns: ColumnDef<PicklistColorRow>[] = [
  {
    accessorKey: "field",
    header: "Field",
    cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.original.field}</span>,
    size: 180,
  },
  {
    accessorKey: "option",
    header: "Option",
    cell: ({ row }) => <span>{row.original.option}</span>,
    size: 280,
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => (
      <ColorPicker value={row.original.color || ""} onSave={(v) => updatePicklistColor(row.original.id, "color", v)} />
    ),
    size: 200,
    enableSorting: false,
  },
  {
    id: "preview",
    header: "Preview",
    cell: ({ row }) => (
      <div style={{
        background: row.original.color || "transparent",
        padding: "4px 12px", borderRadius: 4, fontSize: 13,
        color: isLightColor(row.original.color) ? "var(--foreground)" : "#fff",
      }}>
        {row.original.option}
      </div>
    ),
    size: 280,
    enableSorting: false,
  },
];

function isLightColor(hex: string): boolean {
  if (!hex) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

// --- Grouping toolbar ---

function GroupingToolbar({
  groupFields, groupSortDirs,
  onAddGroup, onRemoveGroup, onToggleGroupSort,
  onExpandAll, onCollapseAll,
}: {
  groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  onAddGroup: (f: string) => void; onRemoveGroup: (i: number) => void;
  onToggleGroupSort: (i: number) => void;
  onExpandAll: () => void; onCollapseAll: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Group</span>
      {groupFields.map((field, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span className="claude-toolbar-btn" style={{ cursor: "default" }}>
            {GROUPABLE_FIELDS.find((f) => f.key === field)?.label || field}
          </span>
          <button className="claude-toolbar-btn-sm" onClick={() => onToggleGroupSort(i)}>
            {groupSortDirs[i] === "asc" ? "↑" : "↓"}
          </button>
          <button className="claude-toolbar-btn-sm" onClick={() => onRemoveGroup(i)}>✕</button>
        </div>
      ))}
      {groupFields.length === 0 && (
        <button className="claude-toolbar-btn" onClick={() => onAddGroup("field")}>Group by Field</button>
      )}
      {groupFields.length > 0 && (
        <>
          <button className="claude-toolbar-btn" onClick={onExpandAll}>Expand all</button>
          <button className="claude-toolbar-btn" onClick={onCollapseAll}>Collapse all</button>
        </>
      )}
    </div>
  );
}

// --- Grouped table body ---

function GroupedTableBody({
  groupFields, groupSortDirs, openGroups, toggleGroup,
}: {
  groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  openGroups: Set<string>; toggleGroup: (key: string) => void;
}) {
  const { table } = useDataTable<PicklistColorRow>();
  const rows = table.getRowModel().rows;

  if (groupFields.length === 0) return <DataTableBody />;

  return (
    <tbody>
      <NestedGroups rows={rows} groupFields={groupFields} groupSortDirs={groupSortDirs}
        depth={0} openGroups={openGroups} toggleGroup={toggleGroup} />
    </tbody>
  );
}

function NestedGroups({
  rows, groupFields, groupSortDirs, depth, openGroups, toggleGroup,
}: {
  rows: Row<PicklistColorRow>[]; groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  depth: number; openGroups: Set<string>; toggleGroup: (key: string) => void;
}) {
  if (groupFields.length === 0) {
    const indent = depth * 24;
    return (
      <>
        {rows.map((row) => (
          <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
            {row.getVisibleCells().map((cell, cellIdx) => {
              const size = cell.column.columnDef.size;
              return (
                <td key={cell.id} style={{ padding: "8px 12px", fontSize: 14, width: size ? `${size}px` : undefined, paddingLeft: cellIdx === 0 ? 12 + indent : 12 }}>
                  {typeof cell.column.columnDef.cell === "function" ? cell.column.columnDef.cell(cell.getContext()) : cell.getValue() as string}
                </td>
              );
            })}
          </tr>
        ))}
      </>
    );
  }

  const [currentField, ...remainingFields] = groupFields;
  const [currentSortDir, ...remainingSortDirs] = groupSortDirs;
  const map = new Map<string, Row<PicklistColorRow>[]>();
  for (const row of rows) {
    const key = (row.original[currentField as keyof PicklistColorRow] as string) || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const sortedEntries = [...map.entries()].sort(([a], [b]) => {
    const cmp = a.localeCompare(b);
    return currentSortDir === "asc" ? cmp : -cmp;
  });

  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <>
      {sortedEntries.map(([label, members]) => {
        const groupKey = `${depth}-${currentField}-${label}`;
        const isOpen = openGroups.has(groupKey);
        const colSpan = rows[0]?.getVisibleCells().length || 4;
        const indent = depth * 24;
        return (
          <React.Fragment key={groupKey}>
            <tr onClick={() => toggleGroup(groupKey)} style={{ cursor: "pointer", background: bg }}>
              <td colSpan={colSpan} style={{ padding: "9px 16px", paddingLeft: 16 + indent }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{isOpen ? "▾" : "▸"}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{label || "—"}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 8px" }}>{members.length}</span>
                </div>
              </td>
            </tr>
            {isOpen && (
              <NestedGroups rows={members} groupFields={remainingFields} groupSortDirs={remainingSortDirs}
                depth={depth + 1} openGroups={openGroups} toggleGroup={toggleGroup} />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

import React from "react";

// --- Record count ---
function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<PicklistColorRow>();
  const filtered = table.getRowModel().rows.length;
  return <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{filtered === total ? `${total} mappings` : `${filtered} of ${total}`}</span>;
}

// --- Main component ---

export function PicklistColorsTable({ data }: { data: PicklistColorRow[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [sorting, setSorting] = useState<SortingState>([{ id: "field", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [groupFields, setGroupFields] = useState<string[]>(["field"]);
  const [groupSortDirs, setGroupSortDirs] = useState<("asc" | "desc")[]>(["asc"]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadViewState(STATE_KEY).then((state) => {
      if (state) {
        if (state.mode) setMode(state.mode as "light" | "dark");
        if (state.sorting) setSorting(state.sorting as SortingState);
        if (state.columnVisibility) setColumnVisibility(state.columnVisibility as VisibilityState);
        if (state.globalFilter) setGlobalFilter(state.globalFilter as string);
        if (state.groupFields) setGroupFields(state.groupFields as string[]);
        if (state.groupSortDirs) setGroupSortDirs(state.groupSortDirs as ("asc" | "desc")[]);
        if (state.openGroups) setOpenGroups(new Set(state.openGroups as string[]));
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveViewState(STATE_KEY, {
        mode, sorting, columnVisibility, globalFilter,
        groupFields, groupSortDirs, openGroups: [...openGroups],
      });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loaded, mode, sorting, columnVisibility, globalFilter, groupFields, groupSortDirs, openGroups]);

  const handleGlobalFilterChange = useCallback((value: string | Record<string, unknown>) => {
    setGlobalFilter(typeof value === "string" ? value : String(value.query ?? ""));
  }, []);

  const toggleGroup = (key: string) => { setOpenGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); };

  const expandAll = () => {
    const keys = new Set<string>();
    const map = new Map<string, PicklistColorRow[]>();
    for (const r of data) { const k = r.field || ""; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
    for (const [label] of map) keys.add(`0-field-${label}`);
    setOpenGroups(keys);
  };

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: "100%", padding: "32px 48px" }}>
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
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Picklist Colors</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search..." />
                <DataTableViewMenu />
                <RecordCount total={data.length} />
                <button style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}>{mode === "light" ? "🌙" : "☀️"}</button>
              </div>
            </div>
          </DataTableToolbarSection>

          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", fontSize: 13,
          }}>
            <GroupingToolbar
              groupFields={groupFields} groupSortDirs={groupSortDirs}
              onAddGroup={(f) => { setGroupFields([f]); setGroupSortDirs(["asc"]); setOpenGroups(new Set()); }}
              onRemoveGroup={() => { setGroupFields([]); setGroupSortDirs([]); setOpenGroups(new Set()); }}
              onToggleGroupSort={() => setGroupSortDirs((prev) => [prev[0] === "asc" ? "desc" : "asc"])}
              onExpandAll={expandAll}
              onCollapseAll={() => setOpenGroups(new Set())}
            />
          </div>

          <DataTable>
            <DataTableHeader sticky />
            <GroupedTableBody
              groupFields={groupFields} groupSortDirs={groupSortDirs}
              openGroups={openGroups} toggleGroup={toggleGroup}
            />
          </DataTable>
        </DataTableRoot>
      </div>

      <style>{`
        .claude-input { width: 100%; padding: 4px 8px; font-size: 14px; font-family: inherit; border: 1px solid var(--ring); border-radius: 6px; background: var(--background); color: var(--foreground); outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }
        .claude-editable { cursor: text; padding: 2px 4px; margin: -2px -4px; border-radius: 4px; word-break: break-word; }
        .claude-editable:hover { background: var(--muted); }
        .claude-empty { color: var(--muted-foreground); opacity: 0.4; }
        .claude-pending { opacity: 0.5; }
        .claude-toolbar-btn { font-family: inherit; font-size: 12px; padding: 4px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground); cursor: pointer; }
        .claude-toolbar-btn:hover { background: var(--accent); }
        .claude-toolbar-btn-sm { font-family: inherit; font-size: 11px; padding: 2px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground); cursor: pointer; }
        .claude-toolbar-btn-sm:hover { background: var(--accent); }
        .color-picker-trigger:hover { background: rgba(0,0,0,0.04); }
      `}</style>
    </div>
  );
}
