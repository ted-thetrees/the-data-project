"use client";

import { useState, useCallback, useContext, useEffect, useRef } from "react";
import { ColContext, ColResizer } from "./col-context";
import { EditableText, EditableSelect } from "./editable-cells";
import { loadTableState, saveTableState } from "./state-actions";
import { DEPTH_COLORS, INDENT_PX, GAP_PX, tableStyles } from "./styles";
import type { ColumnDef, GroupableField, TableRow } from "./types";

// --- Column Headers ---

function ColumnHeaders({ columns, indent }: { columns: ColumnDef[]; indent: number }) {
  const { widths } = useContext(ColContext);
  return (
    <div style={{
      display: "flex", alignItems: "stretch",
      marginLeft: indent, gap: GAP_PX,
      fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em",
      color: "var(--muted-foreground)",
    }}>
      {columns.map((col, i) => (
        <div
          key={col.key}
          style={{
            ...(i < columns.length - 1 ? { width: widths[i], flexShrink: 0 } : { flex: 1, minWidth: widths[i] }),
            position: "relative", padding: "8px 12px",
            background: "var(--muted)",
          }}
        >
          {col.label}
          {i < columns.length - 1 && <ColResizer index={i} />}
        </div>
      ))}
    </div>
  );
}

// --- Image Cell ---

function ImageCell({ value }: { value: unknown }) {
  if (!value) return null;
  let token = "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed[0]?.token) token = parsed[0].token;
    } catch {
      // not JSON
    }
  } else if (Array.isArray(value) && value[0]?.token) {
    token = value[0].token;
  }
  if (!token) return null;
  const url = `/api/teable-image/${token}`;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 2, height: "100%" }}>
      <img
        src={url}
        alt=""
        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 3, display: "block" }}
      />
    </div>
  );
}

// --- Data Row ---

function DataRow({
  row, columns, depth, onUpdate,
}: {
  row: TableRow; columns: ColumnDef[]; depth: number;
  onUpdate: (recordId: string, field: string, value: string) => void;
}) {
  const { widths } = useContext(ColContext);
  const indent = depth * INDENT_PX;
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <div style={{ display: "flex", alignItems: "stretch", marginLeft: indent, gap: GAP_PX }}>
      {columns.map((col, i) => {
        const isLast = i === columns.length - 1;
        const style: React.CSSProperties = {
          background: bg,
          ...(isLast ? { flex: 1, minWidth: widths[i] } : { width: widths[i], flexShrink: 0 }),
          position: "relative",
          ...(col.fontWeight ? { fontWeight: col.fontWeight } : {}),
        };

        return (
          <div key={col.key} className="gt-cell" style={style}>
            {col.type === "image" ? (
              <ImageCell value={row[col.key]} />
            ) : col.type === "date" ? (
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                {row[col.key] ? new Date(row[col.key] as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
              </span>
            ) : col.type === "text" ? (
              <EditableText
                value={(row[col.key] as string) || ""}
                onSave={(v) => onUpdate(row.id, col.key, v)}
              />
            ) : (
              <EditableSelect
                value={row[col.key]}
                options={col.options || []}
                onSave={(v) => onUpdate(row.id, col.key, v)}
              />
            )}
            {!isLast && <ColResizer index={i} />}
          </div>
        );
      })}
    </div>
  );
}

// --- Group Header ---

function GroupHeader({ label, count, open, onToggle, depth }: {
  label: string; count: number; open: boolean; onToggle: () => void; depth: number;
}) {
  const indent = depth * INDENT_PX;
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        marginLeft: indent, padding: "9px 16px",
        cursor: "pointer", background: bg,
        marginTop: depth > 0 ? GAP_PX : 0,
        fontWeight: 600, fontSize: 14 - depth,
      }}
    >
      <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      <span>{label || "—"}</span>
      <span style={{
        fontSize: 11, color: "var(--muted-foreground)",
        background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 8px",
      }}>{count}</span>
    </div>
  );
}

// --- Nested Groups ---

function NestedGroups({
  data, columns, groupFields, groupSortDirs, depth, openGroups, toggleGroup, onUpdate, showHeaders,
}: {
  data: TableRow[]; columns: ColumnDef[]; groupFields: string[]; groupSortDirs: ("asc" | "desc")[];
  depth: number; openGroups: Set<string>; toggleGroup: (g: string) => void;
  onUpdate: (recordId: string, field: string, value: string) => void;
  showHeaders?: boolean;
}) {
  if (groupFields.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: GAP_PX, marginTop: GAP_PX }}>
        {showHeaders && <ColumnHeaders columns={columns} indent={depth * INDENT_PX} />}
        {data.map((row) => (
          <DataRow key={row.id} row={row} columns={columns} depth={depth} onUpdate={onUpdate} />
        ))}
      </div>
    );
  }

  const [currentField, ...remainingFields] = groupFields;
  const [currentSortDir, ...remainingSortDirs] = groupSortDirs;
  const map = new Map<string, TableRow[]>();
  for (const row of data) {
    const key = (row[currentField] as string) || "";
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
              <NestedGroups data={members} columns={columns} groupFields={remainingFields}
                groupSortDirs={remainingSortDirs} depth={depth + 1} openGroups={openGroups}
                toggleGroup={toggleGroup} onUpdate={onUpdate} showHeaders={isLeafGroup} />
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Main Component ---

export function GroupableTable({
  title,
  data,
  columns,
  groupableFields,
  searchFields,
  onUpdate,
}: {
  title: string;
  data: TableRow[];
  columns: ColumnDef[];
  groupableFields: GroupableField[];
  searchFields?: string[];
  onUpdate: (recordId: string, field: string, value: string) => void;
}) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [widths, setWidths] = useState(columns.map((c) => c.width));
  const [sortField, setSortField] = useState(columns[0]?.key || "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [groupSortDirs, setGroupSortDirs] = useState<("asc" | "desc")[]>([]);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved state on mount
  useEffect(() => {
    loadTableState(title).then((saved) => {
      if (saved) {
        if (saved.mode) setMode(saved.mode as "light" | "dark");
        if (saved.widths) setWidths(saved.widths as number[]);
        if (saved.sortField) setSortField(saved.sortField as string);
        if (saved.sortDir) setSortDir(saved.sortDir as "asc" | "desc");
        if (saved.groupFields) setGroupFields(saved.groupFields as string[]);
        if (saved.groupSortDirs) setGroupSortDirs(saved.groupSortDirs as ("asc" | "desc")[]);
        if (saved.search) setSearch(saved.search as string);
        if (saved.openGroups) setOpenGroups(new Set(saved.openGroups as string[]));
      }
      setLoaded(true);
    });
  }, [title]);

  // Debounced save on state change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTableState(title, {
        mode, widths, sortField, sortDir,
        groupFields, groupSortDirs, search,
        openGroups: [...openGroups],
      });
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loaded, title, mode, widths, sortField, sortDir, groupFields, groupSortDirs, search, openGroups]);

  const onResize = useCallback((i: number, delta: number) => {
    setWidths((prev) => { const next = [...prev]; next[i] = Math.max(60, next[i] + delta); return next; });
  }, []);

  const sFields = searchFields || columns.filter((c) => c.type === "text").map((c) => c.key);
  const filtered = data.filter((row) =>
    !search || sFields.some((f) => (row[f] as string || "").toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortField] as string) || "";
    const bv = (b[sortField] as string) || "";
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleGroup = (g: string) => {
    setOpenGroups((prev) => { const next = new Set(prev); if (next.has(g)) next.delete(g); else next.add(g); return next; });
  };

  const expandAll = () => {
    const keys = new Set<string>();
    function collect(rows: TableRow[], fields: string[], depth: number) {
      if (fields.length === 0) return;
      const [field, ...rest] = fields;
      const map = new Map<string, TableRow[]>();
      for (const r of rows) { const k = (r[field] as string) || ""; if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
      for (const [label, members] of map) { keys.add(`${depth}-${field}-${label}`); collect(members, rest, depth + 1); }
    }
    collect(sorted, groupFields, 0);
    setOpenGroups(keys);
  };

  const collapseAll = () => setOpenGroups(new Set());
  const addGroupField = (f: string) => { if (f && !groupFields.includes(f)) { setGroupFields([...groupFields, f]); setGroupSortDirs([...groupSortDirs, "asc"]); setOpenGroups(new Set()); } };
  const removeGroupField = (i: number) => { setGroupFields(groupFields.filter((_, j) => j !== i)); setGroupSortDirs(groupSortDirs.filter((_, j) => j !== i)); setOpenGroups(new Set()); };
  const updateGroupField = (i: number, f: string) => { const next = [...groupFields]; next[i] = f; setGroupFields(next); setOpenGroups(new Set()); };
  const toggleGroupSortDir = (i: number) => { setGroupSortDirs((prev) => { const next = [...prev]; next[i] = next[i] === "asc" ? "desc" : "asc"; return next; }); };

  const sortableFields = columns.map((c) => ({ key: c.key, label: c.label }));

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: "100%", padding: "32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <input type="text" placeholder="Search..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="gt-input" style={{ width: 200 }} />
            <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{sorted.length} records</span>
            <button
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
              onClick={() => setMode(mode === "light" ? "dark" : "light")}
            >{mode === "light" ? "🌙" : "☀️"}</button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap",
          padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", fontSize: 13,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Sort</span>
            <select className="gt-select" value={sortField} onChange={(e) => setSortField(e.target.value)} style={{ width: "auto" }}>
              {sortableFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <button className="gt-toolbar-btn" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Group</span>
            {groupFields.map((field, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {i > 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>→</span>}
                <select className="gt-select" value={field} onChange={(e) => updateGroupField(i, e.target.value)} style={{ width: "auto" }}>
                  {groupableFields.filter((f) => f.key === field || !groupFields.includes(f.key)).map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                <button className="gt-toolbar-btn" onClick={() => toggleGroupSortDir(i)} style={{ padding: "2px 6px", fontSize: 11 }}>
                  {groupSortDirs[i] === "asc" ? "↑" : "↓"}
                </button>
                <button className="gt-toolbar-btn" onClick={() => removeGroupField(i)} style={{ padding: "2px 6px", fontSize: 11 }}>✕</button>
              </div>
            ))}
            {groupFields.length < 5 && (
              <select className="gt-select" value="" onChange={(e) => addGroupField(e.target.value)} style={{ width: "auto" }}>
                <option value="">+ Add level</option>
                {groupableFields.filter((f) => !groupFields.includes(f.key)).map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            )}
            {groupFields.length > 0 && (
              <>
                <button className="gt-toolbar-btn" onClick={expandAll}>Expand all</button>
                <button className="gt-toolbar-btn" onClick={collapseAll}>Collapse all</button>
              </>
            )}
          </div>
        </div>

        <ColContext.Provider value={{ widths, onResize }}>
          <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: GAP_PX }}>
            {groupFields.length > 0 ? (
              <NestedGroups data={sorted} columns={columns} groupFields={groupFields}
                groupSortDirs={groupSortDirs} depth={0} openGroups={openGroups}
                toggleGroup={toggleGroup} onUpdate={onUpdate} showHeaders={false} />
            ) : (
              <>
                <ColumnHeaders columns={columns} indent={0} />
                {sorted.map((row) => <DataRow key={row.id} row={row} columns={columns} depth={0} onUpdate={onUpdate} />)}
              </>
            )}
          </div>
        </ColContext.Provider>
      </div>
      <style>{tableStyles}</style>
    </div>
  );
}
