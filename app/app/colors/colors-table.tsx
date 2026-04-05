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
import { updateColorField } from "./actions";
import {
  loadViewState, saveViewState, loadSavedViews, saveNamedView, deleteNamedView,
  type SavedView,
} from "@/components/data-grid";
import type { ColorRow } from "./page";

const DEPTH_COLORS = [
  "var(--depth-0)", "var(--depth-1)", "var(--depth-2)",
  "var(--depth-3)", "var(--depth-4)",
];

const STATE_KEY = "Colors";
const VIEWS_KEY = "Colors:views";

// --- Inline editing cells ---

function EditableText({
  value, onSave, className, style,
}: {
  value: string; onSave: (v: string) => void; className?: string; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input type="text" defaultValue={value} autoFocus className="claude-input" style={{ width: "100%" }}
        onBlur={(e) => { setEditing(false); if (e.target.value !== value) startTransition(() => onSave(e.target.value)); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
        onClick={(e) => e.stopPropagation()} />
    );
  }

  return (
    <span className={`claude-editable ${isPending ? "claude-pending" : ""} ${className || ""}`} style={style}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {value || <span className="claude-empty">—</span>}
    </span>
  );
}

function EditableSelect({ value, options, onSave }: { value: string | null; options: string[]; onSave: (v: string) => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select value={value || ""} className={`claude-select ${isPending ? "claude-pending" : ""}`}
      onChange={(e) => startTransition(() => onSave(e.target.value))} onClick={(e) => e.stopPropagation()}>
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// --- Swatch cell ---

function SwatchCell({ hex }: { hex: string }) {
  if (!hex) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        background: hex, border: "1px solid var(--border)",
      }} />
    </div>
  );
}

// --- Groupable fields ---
const GROUPABLE_FIELDS = [
  { key: "palette", label: "Palette" },
];

const paletteOptions = [
  "v1", "v2",
  "schemeAccent", "schemeCategory10", "schemeDark2",
  "schemeObservable10", "schemePaired", "schemePastel1",
  "schemePastel2", "schemeSet1", "schemeSet2", "schemeSet3",
  "schemeTableau10",
];

// --- Column definitions ---
const columns: ColumnDef<ColorRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <EditableText value={row.original.name || ""} onSave={(v) => updateColorField(row.original.id, "name", v)} style={{ fontWeight: 500 }} />
    ),
    size: 200,
  },
  {
    accessorKey: "hex",
    header: "Hex",
    cell: ({ row }) => (
      <EditableText value={row.original.hex || ""} onSave={(v) => updateColorField(row.original.id, "hex", v)} style={{ fontFamily: "monospace", fontSize: 13 }} />
    ),
    size: 120,
  },
  {
    accessorKey: "palette",
    header: "Palette",
    cell: ({ row }) => (
      <EditableSelect value={row.original.palette} options={paletteOptions} onSave={(v) => updateColorField(row.original.id, "palette", v)} />
    ),
    size: 100,
  },
  {
    id: "swatch",
    header: "Swatch",
    cell: ({ row }) => <SwatchCell hex={row.original.hex} />,
    size: 70,
    enableSorting: false,
    enableHiding: false,
  },
];

// --- Grouping toolbar ---

function GroupingToolbar({
  groupFields, groupSortDirs,
  onAddGroup, onRemoveGroup, onUpdateGroup, onToggleGroupSort,
  onExpandAll, onCollapseAll,
}: {
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  onAddGroup: (field: string) => void;
  onRemoveGroup: (index: number) => void;
  onUpdateGroup: (index: number, field: string) => void;
  onToggleGroupSort: (index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Group</span>
      {groupFields.map((field, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>→</span>}
          <select className="claude-toolbar-select" value={field}
            onChange={(e) => onUpdateGroup(i, e.target.value)}>
            {GROUPABLE_FIELDS.filter((f) => f.key === field || !groupFields.includes(f.key)).map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button className="claude-toolbar-btn-sm" onClick={() => onToggleGroupSort(i)}>
            {groupSortDirs[i] === "asc" ? "↑" : "↓"}
          </button>
          <button className="claude-toolbar-btn-sm" onClick={() => onRemoveGroup(i)}>✕</button>
        </div>
      ))}
      {groupFields.length < 3 && (
        <select className="claude-toolbar-select" value="" onChange={(e) => { if (e.target.value) onAddGroup(e.target.value); }}>
          <option value="">+ Add level</option>
          {GROUPABLE_FIELDS.filter((f) => !groupFields.includes(f.key)).map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
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

// --- Saved views toolbar ---

function SavedViewsToolbar({
  views, onLoad, onSave, onDelete, currentViewName, onSetName,
}: {
  views: SavedView[]; onLoad: (v: SavedView) => void; onSave: () => void;
  onDelete: (name: string) => void; currentViewName: string; onSetName: (name: string) => void;
}) {
  const [showSave, setShowSave] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Views</span>
      {views.map((v) => (
        <div key={v.name} style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <button className="claude-toolbar-btn" onClick={() => onLoad(v)}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>{v.name}</button>
          <button className="claude-toolbar-btn-sm" onClick={() => onDelete(v.name)}
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none", color: "var(--muted-foreground)" }}>✕</button>
        </div>
      ))}
      {showSave ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="text" value={currentViewName} onChange={(e) => onSetName(e.target.value)}
            placeholder="View name..." className="claude-input" style={{ width: 140, fontSize: 12, padding: "3px 8px" }}
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") { onSave(); setShowSave(false); } if (e.key === "Escape") setShowSave(false); }} />
          <button className="claude-toolbar-btn" onClick={() => { onSave(); setShowSave(false); }}>Save</button>
          <button className="claude-toolbar-btn-sm" onClick={() => setShowSave(false)}>✕</button>
        </div>
      ) : (
        <button className="claude-toolbar-btn" onClick={() => setShowSave(true)}>+ Save view</button>
      )}
    </div>
  );
}

// --- Grouped table body ---

function GroupedTableBody({
  groupFields, groupSortDirs, openGroups, toggleGroup,
}: {
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  openGroups: Set<string>;
  toggleGroup: (key: string) => void;
}) {
  const { table } = useDataTable<ColorRow>();
  const rows = table.getRowModel().rows;

  if (groupFields.length === 0) {
    return <DataTableBody />;
  }

  return (
    <tbody>
      <NestedGroups
        rows={rows}
        groupFields={groupFields}
        groupSortDirs={groupSortDirs}
        depth={0}
        openGroups={openGroups}
        toggleGroup={toggleGroup}
      />
    </tbody>
  );
}

function NestedGroups({
  rows, groupFields, groupSortDirs, depth, openGroups, toggleGroup,
}: {
  rows: Row<ColorRow>[];
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  depth: number;
  openGroups: Set<string>;
  toggleGroup: (key: string) => void;
}) {
  if (groupFields.length === 0) {
    const indent = depth * 24;
    return (
      <>
        {rows.map((row) => (
          <tr key={row.id} className="group" style={{ borderBottom: "1px solid var(--border)" }}>
            {row.getVisibleCells().map((cell, cellIdx) => {
              const size = cell.column.columnDef.size;
              return (
                <td key={cell.id} style={{ padding: "8px 12px", fontSize: 14, width: size ? `${size}px` : undefined, paddingLeft: cellIdx === 0 ? 12 + indent : 12 }}>
                  {typeof cell.column.columnDef.cell === "function"
                    ? cell.column.columnDef.cell(cell.getContext())
                    : cell.getValue() as string}
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
  const map = new Map<string, Row<ColorRow>[]>();
  for (const row of rows) {
    const key = (row.original[currentField as keyof ColorRow] as string) || "";
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
        const indent = depth * 24;
        const colSpan = rows[0]?.getVisibleCells().length || 4;

        return (
          <GroupRow key={groupKey} label={label} count={members.length} open={isOpen}
            onToggle={() => toggleGroup(groupKey)} depth={depth} bg={bg} colSpan={colSpan}>
            {isOpen && (
              <NestedGroups rows={members} groupFields={remainingFields}
                groupSortDirs={remainingSortDirs} depth={depth + 1}
                openGroups={openGroups} toggleGroup={toggleGroup} />
            )}
          </GroupRow>
        );
      })}
    </>
  );
}

function GroupRow({
  label, count, open, onToggle, depth, bg, colSpan, children,
}: {
  label: string; count: number; open: boolean; onToggle: () => void;
  depth: number; bg: string; colSpan: number; children: React.ReactNode;
}) {
  const indent = depth * 24;
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer", background: bg }}>
        <td colSpan={colSpan} style={{ padding: "9px 16px", paddingLeft: 16 + indent }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
            <span style={{ fontWeight: 600, fontSize: 14 - Math.min(depth, 2) }}>{label || "—"}</span>
            <span style={{
              fontSize: 11, color: "var(--muted-foreground)",
              background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 8px",
            }}>{count}</span>
          </div>
        </td>
      </tr>
      {children}
    </>
  );
}

// --- Record count ---

function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<ColorRow>();
  const filtered = table.getRowModel().rows.length;
  return (
    <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
      {filtered === total ? `${total} colors` : `${filtered} of ${total}`}
    </span>
  );
}

// --- Main component ---

export function ColorsTable({ data }: { data: ColorRow[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupSortDirs, setGroupSortDirs] = useState<("asc" | "desc")[]>([]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state + views
  useEffect(() => {
    Promise.all([loadViewState(STATE_KEY), loadSavedViews(VIEWS_KEY)]).then(([state, views]) => {
      if (state) {
        if (state.mode) setMode(state.mode as "light" | "dark");
        if (state.sorting) setSorting(state.sorting as SortingState);
        if (state.columnVisibility) setColumnVisibility(state.columnVisibility as VisibilityState);
        if (state.globalFilter) setGlobalFilter(state.globalFilter as string);
        if (state.groupFields) setGroupFields(state.groupFields as string[]);
        if (state.groupSortDirs) setGroupSortDirs(state.groupSortDirs as ("asc" | "desc")[]);
        if (state.openGroups) setOpenGroups(new Set(state.openGroups as string[]));
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
        mode, sorting, columnVisibility, globalFilter,
        groupFields, groupSortDirs, openGroups: [...openGroups],
      });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loaded, mode, sorting, columnVisibility, globalFilter, groupFields, groupSortDirs, openGroups]);

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
    function collect(rows: ColorRow[], fields: string[], depth: number) {
      if (fields.length === 0) return;
      const [field, ...rest] = fields;
      const map = new Map<string, ColorRow[]>();
      for (const r of rows) { const k = (r[field as keyof ColorRow] as string) || ""; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
      for (const [label, members] of map) { keys.add(`${depth}-${field}-${label}`); collect(members, rest, depth + 1); }
    }
    collect(data, groupFields, 0);
    setOpenGroups(keys);
  };

  // Saved views
  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const view: SavedView = { name: viewName.trim(), sorting, grouping: groupFields, groupSortDirs, columnVisibility, globalFilter };
    saveNamedView(VIEWS_KEY, view).then(() => loadSavedViews(VIEWS_KEY).then(setSavedViews));
    setViewName("");
  };
  const handleLoadView = (view: SavedView) => {
    setSorting(view.sorting); setGroupFields(view.grouping); setGroupSortDirs(view.groupSortDirs);
    setColumnVisibility(view.columnVisibility); setGlobalFilter(view.globalFilter); setOpenGroups(new Set());
  };
  const handleDeleteView = (name: string) => {
    deleteNamedView(VIEWS_KEY, name).then(() => loadSavedViews(VIEWS_KEY).then(setSavedViews));
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
          config={{
            enableSorting: true,
            enableFilters: true,
            enablePagination: false,
          }}
        >
          {/* Toolbar */}
          <DataTableToolbarSection>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Colors</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search colors..." />
                <DataTableViewMenu />
                <RecordCount total={data.length} />
                <button
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}
                >{mode === "light" ? "🌙" : "☀️"}</button>
              </div>
            </div>
          </DataTableToolbarSection>

          {/* Toolbar row 2: Grouping + Saved Views */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", fontSize: 13,
          }}>
            <GroupingToolbar
              groupFields={groupFields} groupSortDirs={groupSortDirs}
              onAddGroup={addGroup} onRemoveGroup={removeGroup}
              onUpdateGroup={updateGroup} onToggleGroupSort={toggleGroupSort}
              onExpandAll={expandAll} onCollapseAll={() => setOpenGroups(new Set())}
            />
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
            <SavedViewsToolbar
              views={savedViews} onLoad={handleLoadView}
              onSave={handleSaveView} onDelete={handleDeleteView}
              currentViewName={viewName} onSetName={setViewName}
            />
          </div>

          {/* Table */}
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
        .claude-input {
          width: 100%; padding: 4px 8px; font-size: 14px; font-family: inherit;
          border: 1px solid var(--ring); border-radius: 6px;
          background: var(--background); color: var(--foreground); outline: none;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
        }
        .claude-select {
          font-size: 12px; font-family: inherit; padding: 3px 6px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer; outline: none; width: 100%;
        }
        .claude-select:focus { border-color: var(--ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }
        .claude-editable { cursor: text; padding: 2px 4px; margin: -2px -4px; border-radius: 4px; word-break: break-word; }
        .claude-editable:hover { background: var(--muted); }
        .claude-empty { color: var(--muted-foreground); opacity: 0.4; }
        .claude-pending { opacity: 0.5; }
        .claude-toolbar-btn {
          font-family: inherit; font-size: 12px; padding: 4px 12px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer;
        }
        .claude-toolbar-btn:hover { background: var(--accent); }
        .claude-toolbar-btn-sm {
          font-family: inherit; font-size: 11px; padding: 2px 6px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer;
        }
        .claude-toolbar-btn-sm:hover { background: var(--accent); }
        .claude-toolbar-select {
          font-size: 12px; font-family: inherit; padding: 3px 6px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer; outline: none;
        }
      `}</style>
    </div>
  );
}
