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

function familiarityColor(f: string | null): string {
  if (!f) return "";
  if (f.startsWith("1")) return "background: color-mix(in srgb, var(--primary) 20%, transparent)";
  if (f.startsWith("2")) return "background: color-mix(in srgb, var(--primary) 12%, transparent)";
  if (f.startsWith("3")) return "background: color-mix(in srgb, var(--primary) 6%, transparent)";
  return "";
}

const COLUMNS = ["Name", "Familiarity", "Gender", "Known As", "Metro Area", "Org Filled", "Desirability", "Teller Status"];

function PersonRow({ person }: { person: Person }) {
  const { widths } = useContext(ColContext);

  return (
    <div className="claude-task-row" style={{ display: "flex", alignItems: "stretch" }}>
      <div className="claude-cell" style={{ width: widths[0], flexShrink: 0, position: "relative", fontWeight: 500, cssText: familiarityColor(person.familiarity) } as any}>
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

const FIELD_KEYS = ["name", "familiarity", "gender", "known_as", "metro_area", "has_org_filled", "target_desirability", "teller_status"];
const GROUPABLE_FIELDS = [
  { key: "", label: "None" },
  { key: "familiarity", label: "Familiarity" },
  { key: "gender", label: "Gender" },
  { key: "metro_area", label: "Metro Area" },
  { key: "has_org_filled", label: "Org Filled" },
  { key: "target_desirability", label: "Desirability" },
  { key: "teller_status", label: "Teller Status" },
];
const SORTABLE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "familiarity", label: "Familiarity" },
  { key: "gender", label: "Gender" },
  { key: "known_as", label: "Known As" },
  { key: "metro_area", label: "Metro Area" },
  { key: "has_org_filled", label: "Org Filled" },
  { key: "target_desirability", label: "Desirability" },
  { key: "teller_status", label: "Teller Status" },
];

function GroupHeader({ label, count, open, onToggle }: { label: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        cursor: "pointer", background: "var(--muted)", borderBottom: "1px solid var(--border)",
        fontWeight: 600, fontSize: 14,
      }}
    >
      <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      <span>{label || "—"}</span>
      <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--secondary)", borderRadius: 999, padding: "1px 8px" }}>{count}</span>
    </div>
  );
}

function GroupedRows({ groups, openGroups, toggleGroup }: { groups: [string, Person[]][]; openGroups: Set<string>; toggleGroup: (g: string) => void }) {
  return (
    <>
      {groups.map(([groupLabel, members]) => (
        <div key={groupLabel}>
          <GroupHeader
            label={groupLabel}
            count={members.length}
            open={openGroups.has(groupLabel)}
            onToggle={() => toggleGroup(groupLabel)}
          />
          {openGroups.has(groupLabel) && members.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </div>
      ))}
    </>
  );
}

export function PeopleTable({ people }: { people: Person[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [widths, setWidths] = useState([200, 160, 80, 140, 180, 120, 140, 180]);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<string>("");
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
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleGroup = (g: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const expandAll = () => {
    if (groupBy) {
      const allLabels = new Set(sorted.map((p) => (p as any)[groupBy] || ""));
      setOpenGroups(allLabels);
    }
  };

  const collapseAll = () => setOpenGroups(new Set());

  // Build groups
  const groups: [string, Person[]][] = [];
  if (groupBy) {
    const map = new Map<string, Person[]>();
    for (const p of sorted) {
      const key = (p as any)[groupBy] || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    groups.push(...map.entries());
    // Auto-expand on first group change
    if (openGroups.size === 0 && groups.length > 0) {
      setTimeout(() => expandAll(), 0);
    }
  }

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div className="claude-container" style={{ maxWidth: "100%", padding: "32px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>People</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="claude-input"
              style={{ width: 200 }}
            />
            <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{sorted.length} people</span>
            <button
              className="claude-mode-toggle"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
              onClick={() => setMode(mode === "light" ? "dark" : "light")}
            >
              {mode === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 16,
          padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", fontSize: 13,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Sort by</span>
            <select className="claude-select" value={sortField} onChange={(e) => setSortField(e.target.value)} style={{ width: "auto" }}>
              {SORTABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <button
              className="claude-toolbar-btn"
              onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            >
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--muted-foreground)" }}>Group by</span>
            <select
              className="claude-select"
              value={groupBy}
              onChange={(e) => { setGroupBy(e.target.value); setOpenGroups(new Set()); }}
              style={{ width: "auto" }}
            >
              {GROUPABLE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            {groupBy && (
              <>
                <button className="claude-toolbar-btn" onClick={expandAll}>Expand all</button>
                <button className="claude-toolbar-btn" onClick={collapseAll}>Collapse all</button>
              </>
            )}
          </div>
        </div>

        <ColContext.Provider value={{ widths, onResize }}>
          {/* Column headers */}
          <div style={{
            display: "flex", alignItems: "center", padding: "10px 16px",
            fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em",
            color: "var(--muted-foreground)", background: "var(--muted)",
            borderRadius: "var(--radius) var(--radius) 0 0", border: "1px solid var(--border)", borderBottom: "2px solid var(--border)",
          }}>
            {COLUMNS.map((col, i) => (
              <div
                key={col}
                style={{
                  ...(i < COLUMNS.length - 1 ? { width: widths[i], flexShrink: 0 } : { flex: 1, minWidth: widths[i] }),
                  position: "relative", padding: "0 8px", cursor: "pointer",
                }}
                onClick={() => handleSort(FIELD_KEYS[i])}
              >
                {col} {sortField === FIELD_KEYS[i] ? (sortDir === "asc" ? "▴" : "▾") : ""}
                {i < COLUMNS.length - 1 && <ColResizer index={i} />}
              </div>
            ))}
          </div>

          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderTop: 0,
            borderRadius: "0 0 var(--radius) var(--radius)", overflow: "hidden",
          }}>
            {groupBy ? (
              <GroupedRows groups={groups} openGroups={openGroups} toggleGroup={toggleGroup} />
            ) : (
              sorted.map((person) => <PersonRow key={person.id} person={person} />)
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
          background: var(--muted);
        }

        .claude-empty {
          color: var(--muted-foreground);
          opacity: 0.4;
        }

        .claude-pending {
          opacity: 0.5;
        }

        .claude-task-row {
          border-bottom: 1px solid var(--border);
        }

        .claude-task-row:last-child {
          border-bottom: none;
        }

        .claude-task-row:hover {
          background: var(--accent);
        }

        .claude-cell {
          padding: 8px 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          border-right: 1px solid var(--border);
        }

        .claude-cell:last-child {
          border-right: none;
        }

        .claude-mode-toggle {
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 6px 12px;
          cursor: pointer;
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
