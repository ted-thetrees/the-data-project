"use client";

import { useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { ColConfig, GroupableField, SavedView } from "./types";

export function SortToolbar({
  sorting, sortableFields, onSortChange, onDirToggle,
}: {
  sorting: SortingState;
  sortableFields: { key: string; label: string }[];
  onSortChange: (field: string) => void;
  onDirToggle: () => void;
}) {
  const sortField = sorting[0]?.id || sortableFields[0]?.key || "";
  const sortDir = sorting[0]?.desc ? "desc" : "asc";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Sort</span>
      <select className="gt-toolbar-select" value={sortField} onChange={(e) => onSortChange(e.target.value)}>
        {sortableFields.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <button className="gt-toolbar-btn" onClick={onDirToggle}>{sortDir === "asc" ? "↑ Asc" : "↓ Desc"}</button>
    </div>
  );
}

export function GroupingToolbar({
  groupFields, groupSortDirs, groupableFields,
  onAddGroup, onRemoveGroup, onUpdateGroup, onToggleGroupSort,
  onExpandAll, onCollapseAll,
}: {
  groupFields: string[];
  groupSortDirs: ("asc" | "desc")[];
  groupableFields: GroupableField[];
  onAddGroup: (f: string) => void;
  onRemoveGroup: (i: number) => void;
  onUpdateGroup: (i: number, f: string) => void;
  onToggleGroupSort: (i: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: 12 }}>Group</span>
      {groupFields.map((field, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {i > 0 && <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>→</span>}
          <select className="gt-toolbar-select" value={field} onChange={(e) => onUpdateGroup(i, e.target.value)}>
            {groupableFields.filter((f) => f.key === field || !groupFields.includes(f.key)).map((f) => (
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
          {groupableFields.filter((f) => !groupFields.includes(f.key)).map((f) => (
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

export function SavedViewsToolbar({
  views, onLoad, onSave, onDelete, currentViewName, onSetName,
}: {
  views: SavedView[];
  onLoad: (v: SavedView) => void;
  onSave: () => void;
  onDelete: (name: string) => void;
  currentViewName: string;
  onSetName: (name: string) => void;
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
