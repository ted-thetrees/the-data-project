"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ColConfig, ColumnFilter } from "./types";

// --- Select filter (checkbox list) ---

function SelectFilterDropdown({
  col, allValues, filter, onFilterChange,
}: {
  col: ColConfig;
  allValues: string[];
  filter?: ColumnFilter & { type: "select" };
  onFilterChange: (filter: ColumnFilter | null) => void;
}) {
  const selected = new Set(filter?.values ?? allValues);
  const allSelected = selected.size === allValues.length;

  const toggle = (val: string) => {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val); else next.add(val);
    if (next.size === allValues.length) onFilterChange(null);
    else if (next.size === 0) onFilterChange(null);
    else onFilterChange({ type: "select", values: [...next] });
  };

  const toggleAll = () => {
    if (allSelected) onFilterChange({ type: "select", values: [] });
    else onFilterChange(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 240, overflowY: "auto" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", fontSize: "var(--font-size-sm)", cursor: "pointer", fontWeight: "var(--font-weight-semibold)" as unknown as number }}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
        Select All
        <span style={{ color: "var(--muted-foreground)", marginLeft: "auto", fontSize: "var(--font-size-xs)" }}>{selected.size}/{allValues.length}</span>
      </label>
      <div style={{ borderTop: "var(--border-width) solid var(--border)", margin: "2px 0" }} />
      {allValues.map((val) => (
        <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: "var(--font-size-sm)", cursor: "pointer", borderRadius: "var(--radius-sm)" }}>
          <input type="checkbox" checked={selected.has(val)} onChange={() => toggle(val)} />
          {val || <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>(empty)</span>}
        </label>
      ))}
    </div>
  );
}

// --- Text filter ---

function TextFilterDropdown({
  filter, onFilterChange,
}: {
  filter?: ColumnFilter & { type: "text" };
  onFilterChange: (filter: ColumnFilter | null) => void;
}) {
  const [operator, setOperator] = useState<"contains" | "equals" | "startsWith">(filter?.operator ?? "contains");
  const [value, setValue] = useState(filter?.value ?? "");

  const apply = (op: typeof operator, val: string) => {
    if (!val.trim()) onFilterChange(null);
    else onFilterChange({ type: "text", operator: op, value: val.trim() });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
      <select
        className="gt-toolbar-select"
        value={operator}
        onChange={(e) => {
          const op = e.target.value as typeof operator;
          setOperator(op);
          if (value.trim()) apply(op, value);
        }}
      >
        <option value="contains">Contains</option>
        <option value="equals">Equals</option>
        <option value="startsWith">Starts with</option>
      </select>
      <input
        type="text"
        className="gt-input"
        placeholder="Filter value..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          apply(operator, e.target.value);
        }}
        autoFocus
      />
    </div>
  );
}

// --- Date filter ---

function DateFilterDropdown({
  filter, onFilterChange,
}: {
  filter?: ColumnFilter & { type: "date" };
  onFilterChange: (filter: ColumnFilter | null) => void;
}) {
  const [from, setFrom] = useState(filter?.from ?? "");
  const [to, setTo] = useState(filter?.to ?? "");

  const apply = (f: string, t: string) => {
    if (!f && !t) onFilterChange(null);
    else onFilterChange({ type: "date", from: f || undefined, to: t || undefined });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
      <label style={{ fontSize: "var(--font-size-xs)", color: "var(--muted-foreground)" }}>From</label>
      <input
        type="date"
        className="gt-input"
        value={from}
        onChange={(e) => { setFrom(e.target.value); apply(e.target.value, to); }}
      />
      <label style={{ fontSize: "var(--font-size-xs)", color: "var(--muted-foreground)" }}>To</label>
      <input
        type="date"
        className="gt-input"
        value={to}
        onChange={(e) => { setTo(e.target.value); apply(from, e.target.value); }}
      />
    </div>
  );
}

// --- Column filter button + dropdown ---

function ColumnFilterButton({
  col, allValues, filter, onFilterChange,
}: {
  col: ColConfig;
  allValues: string[];
  filter?: ColumnFilter;
  onFilterChange: (filter: ColumnFilter | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = !!filter;
  const filterType = col.type === "select" ? "select" : col.type === "date" ? "date" : "text";

  let label = col.label;
  if (isActive) {
    if (filter.type === "select") label += ` (${filter.values.length})`;
    else if (filter.type === "text") label += `: ${filter.value}`;
    else if (filter.type === "date") {
      const parts = [];
      if (filter.from) parts.push(`from ${filter.from}`);
      if (filter.to) parts.push(`to ${filter.to}`);
      label += ` (${parts.join(" ")})`;
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        className="gt-toolbar-btn"
        onClick={() => setOpen(!open)}
        style={{
          ...(isActive ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)" } : {}),
        }}
      >
        {label} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 50,
          marginTop: 4, padding: 8,
          background: "var(--dropdown-bg)", border: "var(--border-width) solid var(--dropdown-border)",
          borderRadius: "var(--dropdown-radius)", boxShadow: "var(--dropdown-shadow)",
          minWidth: 180,
        }} onClick={(e) => e.stopPropagation()}>
          {filterType === "select" && (
            <SelectFilterDropdown col={col} allValues={allValues} filter={filter as ColumnFilter & { type: "select" }} onFilterChange={onFilterChange} />
          )}
          {filterType === "text" && (
            <TextFilterDropdown filter={filter as ColumnFilter & { type: "text" }} onFilterChange={onFilterChange} />
          )}
          {filterType === "date" && (
            <DateFilterDropdown filter={filter as ColumnFilter & { type: "date" }} onFilterChange={onFilterChange} />
          )}
          {isActive && (
            <div style={{ borderTop: "var(--border-width) solid var(--border)", marginTop: 6, paddingTop: 6 }}>
              <button className="gt-toolbar-btn" style={{ width: "100%", fontSize: "var(--font-size-xs)" }}
                onClick={() => { onFilterChange(null); setOpen(false); }}>
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Filter toolbar ---

export function FilterToolbar({
  columns, data, columnFilters, onColumnFiltersChange,
}: {
  columns: ColConfig[];
  data: Record<string, unknown>[];
  columnFilters: Record<string, ColumnFilter>;
  onColumnFiltersChange: (filters: Record<string, ColumnFilter>) => void;
}) {
  const filterableColumns = columns.filter((c) => c.type !== "image" && c.type !== "custom");
  const activeCount = Object.keys(columnFilters).length;

  // Compute unique values for select columns
  const selectValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of filterableColumns) {
      if (col.type === "select") {
        const vals = new Set<string>();
        for (const row of data) {
          const v = row[col.key];
          if (typeof v === "string" && v) vals.add(v);
        }
        map[col.key] = [...vals].sort();
      }
    }
    return map;
  }, [data, filterableColumns]);

  const setFilter = (key: string, filter: ColumnFilter | null) => {
    const next = { ...columnFilters };
    if (filter) next[key] = filter; else delete next[key];
    onColumnFiltersChange(next);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontWeight: "var(--toolbar-label-weight)" as unknown as number, color: "var(--toolbar-label-color)", fontSize: "var(--toolbar-font-size)" }}>
        Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </span>
      {filterableColumns.map((col) => (
        <ColumnFilterButton
          key={col.key}
          col={col}
          allValues={selectValues[col.key] || []}
          filter={columnFilters[col.key]}
          onFilterChange={(f) => setFilter(col.key, f)}
        />
      ))}
      {activeCount > 0 && (
        <button className="gt-toolbar-btn" onClick={() => onColumnFiltersChange({})}>
          Clear all
        </button>
      )}
    </div>
  );
}

// --- Apply column filters to rows ---

export function applyColumnFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: Record<string, ColumnFilter>,
): T[] {
  if (Object.keys(filters).length === 0) return rows;

  return rows.filter((row) => {
    for (const [key, filter] of Object.entries(filters)) {
      const val = row[key];
      const strVal = (val as string) ?? "";

      if (filter.type === "select") {
        if (!filter.values.includes(strVal)) return false;
      } else if (filter.type === "text") {
        const lower = strVal.toLowerCase();
        const target = filter.value.toLowerCase();
        if (filter.operator === "contains" && !lower.includes(target)) return false;
        if (filter.operator === "equals" && lower !== target) return false;
        if (filter.operator === "startsWith" && !lower.startsWith(target)) return false;
      } else if (filter.type === "date") {
        const dateVal = val ? new Date(val as string).toISOString().split("T")[0] : "";
        if (filter.from && dateVal < filter.from) return false;
        if (filter.to && dateVal > filter.to) return false;
      }
    }
    return true;
  });
}
