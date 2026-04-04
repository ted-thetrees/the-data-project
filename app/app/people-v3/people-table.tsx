"use client";

import { useState, useTransition, useEffect, useRef, useCallback, createContext, useContext } from "react";
import type { ColumnDef, SortingState, VisibilityState, Row } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableViewMenu } from "@/components/niko-table/components/data-table-view-menu";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import { updatePersonField } from "./actions";
import {
  loadSavedViews, saveNamedView, deleteNamedView,
  loadViewState, saveViewState,
  type SavedView,
} from "./view-actions";
import type { PersonRow } from "./page";

// --- Constants (from v001 GroupableTable) ---
const DEPTH_COLORS = ["var(--depth-0)", "var(--depth-1)", "var(--depth-2)", "var(--depth-3)", "var(--depth-4)"];
const INDENT_PX = 40;
const GAP_PX = 2;

// --- Column resize context (from v001) ---
const ColContext = createContext<{ widths: number[]; onResize: (i: number, delta: number) => void }>({ widths: [], onResize: () => {} });

function ColResizer({ index }: { index: number }) {
  const { onResize } = useContext(ColContext);
  const startX = useRef(0);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    startX.current = e.clientX;
    const move = (e: MouseEvent) => { onResize(index, e.clientX - startX.current); startX.current = e.clientX; };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
  }, [index, onResize]);
  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, right: -2, width: 5, cursor: "col-resize", zIndex: 10 }}
      onMouseDown={onMouseDown}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--ring)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")} />
  );
}

// --- Inline editing cells ---
function EditableText({ value, onSave, className, style }: { value: string; onSave: (v: string) => void; className?: string; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  if (editing) {
    return <input type="text" defaultValue={value} autoFocus className="gt-input" style={{ width: "100%" }}
      onBlur={(e) => { setEditing(false); if (e.target.value !== value) startTransition(() => onSave(e.target.value)); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
      onClick={(e) => e.stopPropagation()} />;
  }
  return (
    <span className={`gt-editable ${isPending ? "gt-pending" : ""} ${className || ""}`} style={style}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {value || <span className="gt-empty">—</span>}
    </span>
  );
}

function EditableSelect({ value, options, onSave }: { value: string | null; options: string[]; onSave: (v: string) => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select value={value || ""} className={`gt-select ${isPending ? "gt-pending" : ""}`}
      onChange={(e) => startTransition(() => onSave(e.target.value))} onClick={(e) => e.stopPropagation()}>
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ImageCell({ value }: { value: unknown }) {
  if (!value) return null;
  let token = "";
  if (typeof value === "string") { try { const p = JSON.parse(value); if (Array.isArray(p) && p[0]?.token) token = p[0].token; } catch { /* */ } }
  else if (Array.isArray(value) && value[0]?.token) token = value[0].token;
  if (!token) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 2, height: "100%" }}>
      <img src={`/api/teable-image/${token}`} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 3 }} loading="lazy" />
    </div>
  );
}

// --- Options ---
const familiarityOptions = ["1 Very Close + Family", "2 Know | Current", "3 Know | In Past", "4 Acquainted | Talked To", "5 Contacted | No Response", "5 Contacted | Would not Remember Me", "7 Never Met"];
const genderOptions = ["Man", "Woman"];
const orgFilledOptions = ["Yes", "Maybe", "No", "Sort"];
const desirabilityOptions = ["F Yes", "Possible", "Not Sure / Ponder Later", "No"];
const tellerStatusOptions = ["Can Ask When Website Is Up", "When I Have a Kite", "Chit Used", "Done/Recorded!", "Sort", "Do not Want to Ask", "Will Resist/Never Do It"];

const GROUPABLE_FIELDS = [
  { key: "familiarity", label: "Familiarity" },
  { key: "gender", label: "Gender" },
  { key: "metro_area", label: "Metro Area" },
  { key: "has_org_filled", label: "Org Filled" },
  { key: "target_desirability", label: "Desirability" },
  { key: "teller_status", label: "Teller Status" },
];

// --- Column config for rendering ---
interface ColConfig {
  key: string; label: string; type: "text" | "select" | "image"; width: number;
  options?: string[]; fontWeight?: number;
}

const COL_CONFIG: ColConfig[] = [
  { key: "name", label: "Name", type: "text", width: 200, fontWeight: 500 },
  { key: "image", label: "Photo", type: "image", width: 50 },
  { key: "familiarity", label: "Familiarity", type: "select", width: 160, options: familiarityOptions },
  { key: "gender", label: "Gender", type: "select", width: 80, options: genderOptions },
  { key: "known_as", label: "Known As", type: "text", width: 140 },
  { key: "metro_area", label: "Metro Area", type: "text", width: 180 },
  { key: "has_org_filled", label: "Org Filled", type: "select", width: 120, options: orgFilledOptions },
  { key: "target_desirability", label: "Desirability", type: "select", width: 140, options: desirabilityOptions },
  { key: "teller_status", label: "Teller Status", type: "select", width: 180, options: tellerStatusOptions },
];

// --- TanStack column defs (for Niko Table state — sorting, filtering, visibility) ---
const columns: ColumnDef<PersonRow>[] = COL_CONFIG.map((col) => ({
  accessorKey: col.key,
  header: col.label,
  enableSorting: col.type !== "image",
}));

// --- v001-style flex column headers ---
function FlexColumnHeaders({ indent, visibleCols }: { indent: number; visibleCols: ColConfig[] }) {
  const { widths } = useContext(ColContext);
  return (
    <div style={{
      display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX,
      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
      color: "var(--muted-foreground)",
    }}>
      {visibleCols.map((col, i) => (
        <div key={col.key} style={{
          ...(i < visibleCols.length - 1 ? { width: widths[i], flexShrink: 0 } : { flex: 1, minWidth: widths[i] }),
          position: "relative", padding: "8px 12px", background: "var(--muted)",
        }}>
          {col.label}
          {i < visibleCols.length - 1 && <ColResizer index={i} />}
        </div>
      ))}
    </div>
  );
}

// --- v001-style flex data row ---
function FlexDataRow({ row, visibleCols, depth }: { row: Row<PersonRow>; visibleCols: ColConfig[]; depth: number }) {
  const { widths } = useContext(ColContext);
  const indent = depth * INDENT_PX;
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <div style={{ display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX }}>
      {visibleCols.map((col, i) => {
        const isLast = i === visibleCols.length - 1;
        const cellStyle: React.CSSProperties = {
          background: bg,
          ...(isLast ? { flex: 1, minWidth: widths[i] } : { width: widths[i], flexShrink: 0 }),
          position: "relative",
          ...(col.fontWeight ? { fontWeight: col.fontWeight } : {}),
        };

        return (
          <div key={col.key} className="gt-cell" style={cellStyle}>
            {col.type === "image" ? (
              <ImageCell value={row.original[col.key as keyof PersonRow]} />
            ) : col.type === "text" ? (
              <EditableText
                value={(row.original[col.key as keyof PersonRow] as string) || ""}
                onSave={(v) => updatePersonField(row.original.id, col.key, v)}
              />
            ) : (
              <EditableSelect
                value={row.original[col.key as keyof PersonRow] as string | null}
                options={col.options || []}
                onSave={(v) => updatePersonField(row.original.id, col.key, v)}
              />
            )}
            {!isLast && <ColResizer index={i} />}
          </div>
        );
      })}
    </div>
  );
}

// --- v001-style group header ---
function GroupHeader({ label, count, open, onToggle, depth }: {
  label: string; count: number; open: boolean; onToggle: () => void; depth: number;
}) {
  const indent = depth * INDENT_PX;
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 10,
      marginLeft: indent, padding: "9px 16px",
      cursor: "pointer", background: bg,
      marginTop: depth > 0 ? GAP_PX : 0,
      fontWeight: 600, fontSize: 14 - depth,
    }}>
      <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      <span>{label || "—"}</span>
      <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 8px" }}>{count}</span>
    </div>
  );
}

// --- Nested groups with flex rendering ---
function NestedGroups({
  rows, visibleCols, groupFields, groupSortDirs, depth, openGroups, toggleGroup, showHeaders,
}: {
  rows: Row<PersonRow>[]; visibleCols: ColConfig[];
  groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  depth: number; openGroups: Set<string>; toggleGroup: (key: string) => void;
  showHeaders?: boolean;
}) {
  if (groupFields.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: GAP_PX, marginTop: GAP_PX }}>
        {showHeaders && <FlexColumnHeaders indent={depth * INDENT_PX} visibleCols={visibleCols} />}
        {rows.map((row) => <FlexDataRow key={row.id} row={row} visibleCols={visibleCols} depth={depth} />)}
      </div>
    );
  }

  const [currentField, ...remainingFields] = groupFields;
  const [currentSortDir, ...remainingSortDirs] = groupSortDirs;
  const map = new Map<string, Row<PersonRow>[]>();
  for (const row of rows) {
    const key = (row.original[currentField as keyof PersonRow] as string) || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const sortedEntries = [...map.entries()].sort(([a], [b]) => {
    const cmp = a.localeCompare(b);
    return currentSortDir === "asc" ? cmp : -cmp;
  });

  return (
    <>
      {sortedEntries.map(([label, members]) => {
        const groupKey = `${depth}-${currentField}-${label}`;
        const isOpen = openGroups.has(groupKey);
        const isLeafGroup = remainingFields.length === 0;
        return (
          <div key={groupKey}>
            <GroupHeader label={label} count={members.length} open={isOpen}
              onToggle={() => toggleGroup(groupKey)} depth={depth} />
            {isOpen && (
              <NestedGroups rows={members} visibleCols={visibleCols} groupFields={remainingFields}
                groupSortDirs={remainingSortDirs} depth={depth + 1} openGroups={openGroups}
                toggleGroup={toggleGroup} showHeaders={isLeafGroup} />
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Flex body (reads from Niko Table context, renders with v001 visuals) ---
function FlexBody({
  visibleCols, groupFields, groupSortDirs, openGroups, toggleGroup,
}: {
  visibleCols: ColConfig[];
  groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  openGroups: Set<string>; toggleGroup: (key: string) => void;
}) {
  const { table } = useDataTable<PersonRow>();
  const rows = table.getRowModel().rows;

  if (groupFields.length > 0) {
    return (
      <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: GAP_PX }}>
        <NestedGroups rows={rows} visibleCols={visibleCols} groupFields={groupFields}
          groupSortDirs={groupSortDirs} depth={0} openGroups={openGroups}
          toggleGroup={toggleGroup} showHeaders={false} />
      </div>
    );
  }

  // Ungrouped — flat list with column headers
  return (
    <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: GAP_PX }}>
      <FlexColumnHeaders indent={0} visibleCols={visibleCols} />
      {rows.map((row) => <FlexDataRow key={row.id} row={row} visibleCols={visibleCols} depth={0} />)}
    </div>
  );
}

// --- Grouping toolbar ---
function GroupingToolbar({
  groupFields, groupSortDirs,
  onAddGroup, onRemoveGroup, onUpdateGroup, onToggleGroupSort,
  onExpandAll, onCollapseAll,
}: {
  groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  onAddGroup: (f: string) => void; onRemoveGroup: (i: number) => void;
  onUpdateGroup: (i: number, f: string) => void; onToggleGroupSort: (i: number) => void;
  onExpandAll: () => void; onCollapseAll: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Group</span>
      {groupFields.map((field, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>→</span>}
          <select className="gt-toolbar-select" value={field} onChange={(e) => onUpdateGroup(i, e.target.value)}>
            {GROUPABLE_FIELDS.filter((f) => f.key === field || !groupFields.includes(f.key)).map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button className="gt-toolbar-btn" onClick={() => onToggleGroupSort(i)} style={{ padding: "2px 6px", fontSize: 11 }}>
            {groupSortDirs[i] === "asc" ? "↑" : "↓"}
          </button>
          <button className="gt-toolbar-btn" onClick={() => onRemoveGroup(i)} style={{ padding: "2px 6px", fontSize: 11 }}>✕</button>
        </div>
      ))}
      {groupFields.length < 5 && (
        <select className="gt-toolbar-select" value="" onChange={(e) => { if (e.target.value) onAddGroup(e.target.value); }}>
          <option value="">+ Add level</option>
          {GROUPABLE_FIELDS.filter((f) => !groupFields.includes(f.key)).map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      )}
      {groupFields.length > 0 && (
        <>
          <button className="gt-toolbar-btn" onClick={onExpandAll}>Expand all</button>
          <button className="gt-toolbar-btn" onClick={onCollapseAll}>Collapse all</button>
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
        <div key={v.name} style={{ display: "flex", alignItems: "center" }}>
          <button className="gt-toolbar-btn" onClick={() => onLoad(v)} style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>{v.name}</button>
          <button className="gt-toolbar-btn" onClick={() => onDelete(v.name)}
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none", color: "var(--muted-foreground)", padding: "3px 6px", fontSize: 11 }}>✕</button>
        </div>
      ))}
      {showSave ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="text" value={currentViewName} onChange={(e) => onSetName(e.target.value)}
            placeholder="View name..." className="gt-input" style={{ width: 140, fontSize: 12, padding: "3px 8px" }}
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") { onSave(); setShowSave(false); } if (e.key === "Escape") setShowSave(false); }} />
          <button className="gt-toolbar-btn" onClick={() => { onSave(); setShowSave(false); }}>Save</button>
          <button className="gt-toolbar-btn" onClick={() => setShowSave(false)} style={{ padding: "2px 6px", fontSize: 11 }}>✕</button>
        </div>
      ) : (
        <button className="gt-toolbar-btn" onClick={() => setShowSave(true)}>+ Save view</button>
      )}
    </div>
  );
}

// --- Sort toolbar ---
function SortToolbar({ sorting, onSortChange, onDirToggle }: {
  sorting: SortingState; onSortChange: (field: string) => void; onDirToggle: () => void;
}) {
  const sortField = sorting[0]?.id || "name";
  const sortDir = sorting[0]?.desc ? "desc" : "asc";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Sort</span>
      <select className="gt-toolbar-select" value={sortField} onChange={(e) => onSortChange(e.target.value)}>
        {COL_CONFIG.filter((c) => c.type !== "image").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <button className="gt-toolbar-btn" onClick={onDirToggle}>{sortDir === "asc" ? "↑ Asc" : "↓ Desc"}</button>
    </div>
  );
}

// --- Record count (reads from Niko Table context) ---
function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<PersonRow>();
  const filtered = table.getRowModel().rows.length;
  return <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{filtered === total ? `${total} records` : `${filtered} of ${total}`}</span>;
}

// --- Main component ---
export function PeopleTable({ data }: { data: PersonRow[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [widths, setWidths] = useState(COL_CONFIG.map((c) => c.width));
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

  const onResize = useCallback((i: number, delta: number) => {
    setWidths((prev) => { const next = [...prev]; next[i] = Math.max(60, next[i] + delta); return next; });
  }, []);

  // Visible columns based on Niko Table's columnVisibility
  const visibleCols = COL_CONFIG.filter((col) => columnVisibility[col.key] !== false);
  // Sync widths array to visible columns
  const visibleWidths = visibleCols.map((col) => {
    const origIdx = COL_CONFIG.findIndex((c) => c.key === col.key);
    return widths[origIdx];
  });

  // Load state + views
  useEffect(() => {
    Promise.all([loadViewState("People-v3"), loadSavedViews()]).then(([state, views]) => {
      if (state) {
        if (state.mode) setMode(state.mode as "light" | "dark");
        if (state.widths) setWidths(state.widths as number[]);
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
      saveViewState("People-v3", {
        mode, widths, sorting, columnVisibility, globalFilter,
        groupFields, groupSortDirs, openGroups: [...openGroups],
      });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loaded, mode, widths, sorting, columnVisibility, globalFilter, groupFields, groupSortDirs, openGroups]);

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
    const view: SavedView = { name: viewName.trim(), sorting, grouping: groupFields, groupSortDirs, columnVisibility, globalFilter };
    saveNamedView(view).then(() => loadSavedViews().then(setSavedViews));
    setViewName("");
  };
  const handleLoadView = (view: SavedView) => {
    setSorting(view.sorting); setGroupFields(view.grouping); setGroupSortDirs(view.groupSortDirs);
    setColumnVisibility(view.columnVisibility); setGlobalFilter(view.globalFilter); setOpenGroups(new Set());
  };
  const handleDeleteView = (name: string) => { deleteNamedView(name).then(() => loadSavedViews().then(setSavedViews)); };

  // Sort handlers
  const handleSortFieldChange = (field: string) => setSorting([{ id: field, desc: sorting[0]?.desc || false }]);
  const handleSortDirToggle = () => setSorting([{ id: sorting[0]?.id || "name", desc: !sorting[0]?.desc }]);

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
          {/* Header */}
          <DataTableToolbarSection>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>People</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search people..." />
                <DataTableViewMenu />
                <RecordCount total={data.length} />
                <button style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}>{mode === "light" ? "🌙" : "☀️"}</button>
              </div>
            </div>
          </DataTableToolbarSection>

          {/* Toolbar row 2 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", fontSize: 13,
          }}>
            <SortToolbar sorting={sorting} onSortChange={handleSortFieldChange} onDirToggle={handleSortDirToggle} />
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
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

          {/* v001-style flex body */}
          <ColContext.Provider value={{ widths: visibleWidths, onResize }}>
            <FlexBody
              visibleCols={visibleCols}
              groupFields={groupFields} groupSortDirs={groupSortDirs}
              openGroups={openGroups} toggleGroup={toggleGroup}
            />
          </ColContext.Provider>
        </DataTableRoot>
      </div>

      <style>{`
        .gt-input {
          width: 100%; padding: 4px 8px; font-size: 14px; font-family: inherit;
          border: 1px solid var(--ring); border-radius: 6px;
          background: var(--background); color: var(--foreground); outline: none;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
        }
        .gt-select {
          font-size: 12px; font-family: inherit; padding: 3px 6px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer; outline: none; width: 100%;
        }
        .gt-select:focus { border-color: var(--ring); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent); }
        .gt-editable { cursor: text; padding: 2px 4px; margin: -2px -4px; border-radius: 4px; word-break: break-word; }
        .gt-editable:hover { background: rgba(0,0,0,0.04); }
        .gt-empty { color: var(--muted-foreground); opacity: 0.4; }
        .gt-pending { opacity: 0.5; }
        .gt-cell { padding: 8px 12px; font-size: 14px; display: flex; align-items: center; min-height: 36px; }
        .gt-toolbar-btn {
          font-family: inherit; font-size: 12px; padding: 3px 10px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer;
        }
        .gt-toolbar-btn:hover { background: var(--accent); }
        .gt-toolbar-select {
          font-size: 12px; font-family: inherit; padding: 3px 6px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--background); color: var(--foreground); cursor: pointer; outline: none;
        }
      `}</style>
    </div>
  );
}
