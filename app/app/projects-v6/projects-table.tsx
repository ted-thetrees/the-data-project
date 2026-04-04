"use client";

import { useState, useCallback, useTransition } from "react";
import type { ColumnDef, ExpandedState, FilterFn, Row } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTable } from "@/components/niko-table/core/data-table";
import { DataTableHeader, DataTableBody } from "@/components/niko-table/core/data-table-structure";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableViewMenu } from "@/components/niko-table/components/data-table-view-menu";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { updateTickleDate, updateTaskField } from "../projects-v5/actions";
import type { ProjectRow } from "./page";

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function tickleUrgency(d: string | null | undefined): "overdue" | "soon" | "ok" | "none" {
  if (!d) return "none";
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "overdue";
  if (diff < 3) return "soon";
  return "ok";
}

// --- Inline editing cells ---

function EditableText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="text"
        defaultValue={value}
        autoFocus
        className="claude-input"
        style={{ width: "100%" }}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) onSave(e.target.value);
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
    <span
      className={`claude-editable ${className || ""}`}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {value || <span className="claude-empty">—</span>}
    </span>
  );
}

function TickleBadge({ date, taskIds }: { date?: string | null; taskIds: string[] }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const urgency = tickleUrgency(date);

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={toInputDate(date)}
        autoFocus
        className="claude-input claude-date-input"
        onBlur={(e) => {
          setEditing(false);
          const newDate = e.target.value;
          if (newDate && newDate !== toInputDate(date)) {
            startTransition(() => updateTickleDate(taskIds, newDate + "T00:00:00.000Z"));
          }
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
    <span
      className={`claude-badge claude-badge-${urgency} ${isPending ? "claude-pending" : ""}`}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {date ? formatDate(date) : "No date"}
    </span>
  );
}

function StatusSelect({ value, recordId }: { value: string | undefined; recordId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value || "Tickled"}
      className={`claude-select ${isPending ? "claude-pending" : ""}`}
      onChange={(e) => {
        e.stopPropagation();
        startTransition(() => updateTaskField(recordId, "taskStatus", e.target.value));
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="Tickled">⏳ Tickled</option>
      <option value="Done">✓ Done</option>
    </select>
  );
}

// --- Tree cell with expand/collapse + indentation ---

function TreeNameCell({ row }: { row: Row<ProjectRow> }) {
  const node = row.original;
  const depth = row.depth;
  const canExpand = row.getCanExpand();
  const isExpanded = row.getIsExpanded();
  const [isPending, startTransition] = useTransition();

  const indent = depth * 24;

  const fontWeight = node.nodeType === "uber" ? 700 : node.nodeType === "project" ? 600 : 400;
  const fontSize = node.nodeType === "uber" ? 16 : node.nodeType === "project" ? 14 : 14;
  const isDone = node.taskStatus === "Done";

  return (
    <div style={{ display: "flex", alignItems: "center", paddingLeft: indent, gap: 8 }}>
      {canExpand ? (
        <button
          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: "var(--muted-foreground)", fontSize: 12, width: 16, textAlign: "center",
            flexShrink: 0,
          }}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
      ) : (
        <span style={{ width: 16, flexShrink: 0 }} />
      )}
      <span style={{ fontWeight, fontSize, textDecoration: isDone ? "line-through" : undefined, color: isDone ? "var(--muted-foreground)" : undefined }}>
        {node.nodeType === "task" ? (
          <EditableText
            value={node.name}
            onSave={(v) => startTransition(() => updateTaskField(node.id, "task", v))}
          />
        ) : (
          node.name
        )}
      </span>
      {node.taskCount !== undefined && (
        <span style={{
          fontSize: 11, color: "var(--muted-foreground)",
          background: "rgba(0,0,0,0.06)", borderRadius: 999, padding: "1px 8px",
          fontWeight: 500, flexShrink: 0,
        }}>
          {node.taskCount}
        </span>
      )}
    </div>
  );
}

// --- Custom global filter that searches tree recursively ---

const treeGlobalFilter: FilterFn<ProjectRow> = (row, _columnId, filterValue) => {
  const search = (filterValue as string).toLowerCase();
  if (!search) return true;

  const node = row.original;
  // Check this node
  if (node.name?.toLowerCase().includes(search)) return true;
  if (node.taskResult?.toLowerCase().includes(search)) return true;
  if (node.taskNotes?.toLowerCase().includes(search)) return true;

  // Check children recursively
  if (node.subRows) {
    return node.subRows.some(
      (child) =>
        child.name?.toLowerCase().includes(search) ||
        child.taskResult?.toLowerCase().includes(search) ||
        child.taskNotes?.toLowerCase().includes(search) ||
        child.subRows?.some(
          (grandchild) =>
            grandchild.name?.toLowerCase().includes(search) ||
            grandchild.taskResult?.toLowerCase().includes(search) ||
            grandchild.taskNotes?.toLowerCase().includes(search)
        )
    );
  }

  return false;
};

// --- Column definitions ---

const columns: ColumnDef<ProjectRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <TreeNameCell row={row} />,
    size: 360,
    enableSorting: false,
  },
  {
    accessorKey: "tickleDate",
    header: "Tickle Date",
    cell: ({ row }) => {
      const node = row.original;
      if (node.nodeType === "project") {
        const taskIds = node.subRows?.map((t) => t.id) || [];
        return <TickleBadge date={node.tickleDate} taskIds={taskIds} />;
      }
      return null;
    },
    size: 140,
    enableSorting: false,
  },
  {
    accessorKey: "taskStatus",
    header: "Status",
    cell: ({ row }) => {
      const node = row.original;
      if (node.nodeType === "task") {
        return <StatusSelect value={node.taskStatus} recordId={node.id} />;
      }
      return null;
    },
    size: 120,
    enableSorting: false,
  },
  {
    accessorKey: "taskResult",
    header: "Result",
    cell: ({ row }) => {
      const node = row.original;
      if (node.nodeType !== "task") return null;
      return (
        <EditableText
          value={node.taskResult || ""}
          onSave={(v) => updateTaskField(node.id, "taskResult", v)}
        />
      );
    },
    size: 160,
    enableSorting: false,
  },
  {
    accessorKey: "taskNotes",
    header: "Notes",
    cell: ({ row }) => {
      const node = row.original;
      if (node.nodeType !== "task") return null;
      return (
        <EditableText
          value={node.taskNotes || ""}
          onSave={(v) => updateTaskField(node.id, "taskNotes", v)}
          className="claude-notes-text"
        />
      );
    },
    enableSorting: false,
  },
];

// --- Main component ---

export function ProjectsTable({ data, taskCount }: { data: ProjectRow[]; taskCount: number }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [expanded, setExpanded] = useState<ExpandedState>(true); // Start fully expanded
  const [globalFilter, setGlobalFilter] = useState("");

  // Auto-expand parents when searching
  const handleGlobalFilterChange = useCallback((value: string | Record<string, unknown>) => {
    const searchStr = typeof value === "string" ? value : String(value.query ?? "");
    setGlobalFilter(searchStr);
    if (searchStr) {
      setExpanded(true); // Expand all when searching
    }
  }, []);

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: "100%", padding: "32px 48px" }}>
        <DataTableRoot
          data={data}
          columns={columns}
          getSubRows={(row) => row.subRows}
          getRowCanExpand={(row) => !!row.original.subRows?.length}
          getRowId={(row) => row.id}
          globalFilterFn={treeGlobalFilter}
          state={{ expanded, globalFilter }}
          onExpandedChange={setExpanded}
          onGlobalFilterChange={handleGlobalFilterChange}
          config={{
            enableExpanding: true,
            enableFilters: true,
            enableSorting: false,
            enablePagination: false,
          }}
        >
          {/* Toolbar */}
          <DataTableToolbarSection>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Projects</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search projects..." />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setExpanded(true)}
                    className="claude-toolbar-btn"
                  >
                    Expand all
                  </button>
                  <button
                    onClick={() => setExpanded({})}
                    className="claude-toolbar-btn"
                  >
                    Collapse all
                  </button>
                </div>
                <DataTableViewMenu />
                <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{taskCount} tasks</span>
                <button
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}
                >
                  {mode === "light" ? "🌙" : "☀️"}
                </button>
              </div>
            </div>
          </DataTableToolbarSection>

          {/* Table */}
          <DataTable>
            <DataTableHeader sticky />
            <DataTableBody />
          </DataTable>
        </DataTableRoot>
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
        .claude-date-input {
          width: 160px;
          font-size: 12px;
        }
        .claude-select {
          font-size: 12px;
          font-family: inherit;
          padding: 3px 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          cursor: pointer;
          outline: none;
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
        .claude-notes-text {
          color: var(--muted-foreground);
          font-style: italic;
        }
        .claude-pending {
          opacity: 0.5;
        }
        .claude-badge {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          padding: 2px 10px;
          border-radius: 999px;
          cursor: pointer;
          transition: opacity 0.15s;
          font-variant-numeric: tabular-nums;
        }
        .claude-badge:hover { opacity: 0.8; }
        .claude-badge-overdue { background: #c96442; color: white; }
        .claude-badge-soon { background: #e8a87c; color: #3d3929; }
        .claude-badge-ok { background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border); }
        .claude-badge-none { background: var(--muted); color: var(--muted-foreground); }
        .claude-toolbar-btn {
          font-family: inherit;
          font-size: 12px;
          padding: 4px 12px;
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
