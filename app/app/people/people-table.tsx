"use client";

import { useState, useTransition, useCallback, useRef, createContext, useContext } from "react";
import { updatePersonField } from "./actions";

interface Person {
  id: string;
  name: string;
  familiarity: string | null;
  gender: string | null;
  known_as: string | null;
  metro_area: string | null;
  has_org_filled: string | null;
  target_desirability: string | null;
  teller_status: string | null;
}

const ColContext = createContext<{ widths: number[]; onResize: (i: number, delta: number) => void }>({
  widths: [200, 160, 80, 140, 180, 120, 140, 180],
  onResize: () => {},
});

function ColResizer({ index }: { index: number }) {
  const { onResize } = useContext(ColContext);
  const startX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    const move = (e: MouseEvent) => {
      onResize(index, e.clientX - startX.current);
      startX.current = e.clientX;
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [index, onResize]);

  return (
    <div
      style={{
        position: "absolute", top: 0, bottom: 0, right: -2, width: 5,
        cursor: "col-resize", zIndex: 10,
      }}
      onMouseDown={onMouseDown}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--ring)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    />
  );
}

function EditableText({ value, recordId, field }: { value: string; recordId: string; field: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input
        type="text"
        defaultValue={value}
        autoFocus
        className="claude-input"
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) startTransition(() => updatePersonField(recordId, field, e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span className={`claude-editable ${isPending ? "claude-pending" : ""}`} onClick={() => setEditing(true)}>
      {value || <span className="claude-empty">—</span>}
    </span>
  );
}

function EditableSelect({
  value, recordId, field, options,
}: {
  value: string | null; recordId: string; field: string; options: string[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value || ""}
      className={`claude-select ${isPending ? "claude-pending" : ""}`}
      onChange={(e) => startTransition(() => updatePersonField(recordId, field, e.target.value))}
    >
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const FAMILIARITY_OPTIONS = [
  "1 Very Close + Family", "2 Know | Current", "3 Know | In Past",
  "4 Acquainted | Talked To", "5 Contacted | No Response",
  "5 Contacted | Would not Remember Me", "7 Never Met",
];
const GENDER_OPTIONS = ["Man", "Woman"];
const ORG_OPTIONS = ["Yes", "Maybe", "No", "Sort"];
const DESIRABILITY_OPTIONS = ["F Yes", "Possible", "Not Sure / Ponder Later", "No"];
const TELLER_OPTIONS = [
  "Can Ask When Website Is Up", "When I Have a Kite", "Chit Used",
  "Done/Recorded!", "Sort", "Do not Want to Ask", "Will Resist/Never Do It",
];

const COLUMNS = ["Name", "Familiarity", "Gender", "Known As", "Metro Area", "Org Filled", "Desirability", "Teller Status"];
const FIELD_KEYS = ["name", "familiarity", "gender", "known_as", "metro_area", "has_org_filled", "target_desirability", "teller_status"];

const GROUPABLE_FIELDS = [
  { key: "familiarity", label: "Familiarity" },
  { key: "gender", label: "Gender" },
  { key: "metro_area", label: "Metro Area" },
  { key: "has_org_filled", label: "Org Filled" },
  { key: "target_desirability", label: "Desirability" },
  { key: "teller_status", label: "Teller Status" },
];
const SORTABLE_FIELDS = COLUMNS.map((label, i) => ({ key: FIELD_KEYS[i], label }));

// Depth-based muted background hues
const DEPTH_COLORS = [
  "rgba(201, 100, 66, 0.06)",   // warm cream/terracotta
  "rgba(120, 160, 120, 0.08)",  // muted sage
  "rgba(140, 120, 180, 0.08)",  // muted lavender
  "rgba(200, 140, 120, 0.08)",  // muted peach
  "rgba(120, 160, 200, 0.08)",  // muted sky
];

const INDENT_PX = 40;

function ColumnHeaders({ indent }: { indent: number }) {
  const { widths } = useContext(ColContext);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      marginLeft: indent,
      padding: "8px 0",
      fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em",
      color: "var(--muted-foreground)",
      background: "var(--muted)",
    }}>
      {COLUMNS.map((col, i) => (
        <div
          key={col}
          style={{
            ...(i < COLUMNS.length - 1 ? { width: widths[i], flexShrink: 0 } : { flex: 1, minWidth: widths[i] }),
            position: "relative", padding: "0 12px",
          }}
        >
          {col}
          {i < COLUMNS.length - 1 && <ColResizer index={i} />}
        </div>
      ))}
    </div>
  );
}

function PersonRow({ person, depth }: { person: Person; depth: number }) {
  const { widths } = useContext(ColContext);
  const indent = depth * INDENT_PX;
  const bg = DEPTH_COLORS[depth] || DEPTH_COLORS[DEPTH_COLORS.length - 1];

  return (
    <div style={{
      display: "flex", alignItems: "stretch",
      marginLeft: indent,
      background: bg,
    }}>
      <div className="claude-cell" style={{ width: widths[0], flexShrink: 0, position: "relative", fontWeight: 500 }}>
        <EditableText value={person.name} recordId={person.id} field="name" />
        <ColResizer index={0} />
      </div>
      <div className="claude-cell" style={{ width: widths[1], flexShrink: 0, position: "relative" }}>
        <EditableSelect value={person.familiarity} recordId={person.id} field="familiarity" options={FAMILIARITY_OPTIONS} />
        <ColResizer index={1} />
      </div>
      <div className="claude-cell" style={{ width: widths[2], flexShrink: 0, position: "relative" }}>
        <EditableSelect value={person.gender} recordId={person.id} field="gender" options={GENDER_OPTIONS} />
        <ColResizer index={2} />
      </div>
      <div className="claude-cell" style={{ width: widths[3], flexShrink: 0, position: "relative" }}>
        <EditableText value={person.known_as || ""} recordId={person.id} field="knownAs" />
        <ColResizer index={3} />
      </div>
      <div className="claude-cell" style={{ width: widths[4], flexShrink: 0, position: "relative" }}>
        <EditableText value={person.metro_area || ""} recordId={person.id} field="metroArea" />
        <ColResizer index={4} />
      </div>
      <div className="claude-cell" style={{ width: widths[5], flexShrink: 0, position: "relative" }}>
        <EditableSelect value={person.has_org_filled} recordId={person.id} field="hasOrgFilled" options={ORG_OPTIONS} />
        <ColResizer index={5} />
      </div>
      <div className="claude-cell" style={{ width: widths[6], flexShrink: 0, position: "relative" }}>
        <EditableSelect value={person.target_desirability} recordId={person.id} field="targetDesirability" options={DESIRABILITY_OPTIONS} />
        <ColResizer index={6} />
      </div>
      <div className="claude-cell" style={{ flex: 1, minWidth: widths[7] }}>
        <EditableSelect value={person.teller_status} recordId={person.id} field="tellerStatus" options={TELLER_OPTIONS} />
      </div>
    </div>
  );
}

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
        marginLeft: indent,
        padding: "9px 16px",
        cursor: "pointer",
        background: bg,
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

function NestedGroups({
  people, groupFields, depth, openGroups, toggleGroup, showHeaders,
}: {
  people: Person[]; groupFields: string[]; depth: number;
  openGroups: Set<string>; toggleGroup: (g: string) => void;
  showHeaders?: boolean;
}) {
  if (groupFields.length === 0) {
    return (
      <div>
        {showHeaders && <ColumnHeaders indent={depth * INDENT_PX} />}
        {people.map((p, i) => (
          <PersonRow key={p.id} person={p} depth={depth} />
        ))}
      </div>
    );
  }

  const [currentField, ...remainingFields] = groupFields;
  const map = new Map<string, Person[]>();
  for (const p of people) {
    const key = (p as any)[currentField] || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  return (
    <>
      {[...map.entries()].map(([label, members]) => {
        const groupKey = `${depth}-${currentField}-${label}`;
        const isOpen = openGroups.has(groupKey);
        const isLeafGroup = remainingFields.length === 0;
        return (
          <div key={groupKey}>
            <GroupHeader
              label={label}
              count={members.length}
              open={isOpen}
              onToggle={() => toggleGroup(groupKey)}
              depth={depth}
            />
            {isOpen && (
              <NestedGroups
                people={members}
                groupFields={remainingFields}
                depth={depth + 1}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                showHeaders={isLeafGroup}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function PeopleTable({ people }: { people: Person[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [widths, setWidths] = useState([200, 160, 80, 140, 180, 120, 140, 180]);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupFields, setGroupFields] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const onResize = useCallback((i: number, delta: number) => {
    setWidths((prev) => {
      const next = [...prev];
      next[i] = Math.max(60, next[i] + delta);
      return next;
    });
  }, []);

  const filtered = people.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.known_as && p.known_as.toLowerCase().includes(search.toLowerCase())) ||
    (p.metro_area && p.metro_area.toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = (a as any)[sortField] || "";
    const bv = (b as any)[sortField] || "";
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const toggleGroup = (g: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  const expandAll = () => {
    const keys = new Set<string>();
    function collect(people: Person[], fields: string[], depth: number) {
      if (fields.length === 0) return;
      const [field, ...rest] = fields;
      const map = new Map<string, Person[]>();
      for (const p of people) {
        const key = (p as any)[field] || "";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
      for (const [label, members] of map) {
        keys.add(`${depth}-${field}-${label}`);
        collect(members, rest, depth + 1);
      }
    }
    collect(sorted, groupFields, 0);
    setOpenGroups(keys);
  };

  const collapseAll = () => setOpenGroups(new Set());

  const addGroupField = (field: string) => {
    if (field && !groupFields.includes(field)) {
      setGroupFields([...groupFields, field]);
      setOpenGroups(new Set());
    }
  };

  const removeGroupField = (index: number) => {
    setGroupFields(groupFields.filter((_, i) => i !== index));
    setOpenGroups(new Set());
  };

  const updateGroupField = (index: number, field: string) => {
    const next = [...groupFields];
    next[index] = field;
    setGroupFields(next);
    setOpenGroups(new Set());
  };

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: "100%", padding: "32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>People</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <input
              type="text" placeholder="Search..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="claude-input" style={{ width: 200 }}
            />
            <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{sorted.length} people</span>
            <button
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
              onClick={() => setMode(mode === "light" ? "dark" : "light")}
            >
              {mode === "light" ? "🌙" : "☀️"}
            </button>
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
            <select className="claude-select" value={sortField} onChange={(e) => setSortField(e.target.value)} style={{ width: "auto" }}>
              {SORTABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <button className="claude-toolbar-btn" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Group</span>
            {groupFields.map((field, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {i > 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>→</span>}
                <select className="claude-select" value={field}
                  onChange={(e) => updateGroupField(i, e.target.value)} style={{ width: "auto" }}>
                  {GROUPABLE_FIELDS.filter((f) => f.key === field || !groupFields.includes(f.key)).map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                <button className="claude-toolbar-btn" onClick={() => removeGroupField(i)} style={{ padding: "2px 6px", fontSize: 11 }}>✕</button>
              </div>
            ))}
            {groupFields.length < 5 && (
              <select className="claude-select" value="" onChange={(e) => addGroupField(e.target.value)} style={{ width: "auto" }}>
                <option value="">+ Add level</option>
                {GROUPABLE_FIELDS.filter((f) => !groupFields.includes(f.key)).map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            )}
            {groupFields.length > 0 && (
              <>
                <button className="claude-toolbar-btn" onClick={expandAll}>Expand all</button>
                <button className="claude-toolbar-btn" onClick={collapseAll}>Collapse all</button>
              </>
            )}
          </div>
        </div>

        <ColContext.Provider value={{ widths, onResize }}>
          {/* Top border */}
          <div style={{ overflow: "hidden" }}>
            {groupFields.length > 0 ? (
              <NestedGroups
                people={sorted}
                groupFields={groupFields}
                depth={0}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                showHeaders={false}
              />
            ) : (
              <>
                <ColumnHeaders indent={0} />
                {sorted.map((person) => <PersonRow key={person.id} person={person} depth={0} />)}
              </>
            )}
          </div>
        </ColContext.Provider>
      </div>

      <style>{`
        .claude-input {
          width: 100%;
          padding: 4px 8px;
          font-size: 14px;
          font-family: inherit;
          border: 1px solid var(--ring);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
        }
        .claude-select {
          font-size: 12px;
          font-family: inherit;
          padding: 3px 6px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          cursor: pointer;
          outline: none;
          width: 100%;
        }
        .claude-select:focus {
          border-color: var(--ring);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
        }
        .claude-editable {
          cursor: text;
          padding: 2px 4px;
          margin: -2px -4px;
          border-radius: 4px;
          word-break: break-word;
        }
        .claude-editable:hover {
          background: rgba(0,0,0,0.04);
        }
        .claude-empty {
          color: var(--muted-foreground);
          opacity: 0.4;
        }
        .claude-pending {
          opacity: 0.5;
        }
        .claude-cell {
          padding: 8px 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          min-height: 36px;
        }
        .claude-toolbar-btn {
          font-family: inherit;
          font-size: 12px;
          padding: 3px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          cursor: pointer;
        }
        .claude-toolbar-btn:hover {
          background: var(--accent);
        }
      `}</style>
    </div>
  );
}
