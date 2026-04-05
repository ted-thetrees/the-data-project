"use client";

import { useState, useTransition, useCallback, useRef, createContext, useContext } from "react";
import { updateTickleDate, updateTaskField } from "./actions";
import type { TreeTask } from "./page";

const ColContext = createContext<{ widths: number[]; onResize: (i: number, delta: number) => void }>({
  widths: [300, 120, 150, 200],
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
        position: "absolute",
        top: 0,
        bottom: 0,
        right: -2,
        width: 5,
        cursor: "col-resize",
        zIndex: 10,
      }}
      onMouseDown={onMouseDown}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--ring)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    />
  );
}

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
        className={`claude-input ${className || ""}`}
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
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {value || <span className="claude-empty">—</span>}
    </span>
  );
}

function TickleBadge({
  date,
  taskIds,
}: {
  date: string | undefined;
  taskIds: string[];
}) {
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
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {date ? formatDate(date) : "No date"}
    </span>
  );
}

function StatusSelect({
  value,
  recordId,
}: {
  value: string | undefined;
  recordId: string;
}) {
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

function TaskRow({ node }: { node: TreeTask }) {
  const [isPending, startTransition] = useTransition();
  const { widths } = useContext(ColContext);
  const isDone = node.taskStatus === "Done";

  return (
    <div className={`claude-task-row ${isPending ? "claude-pending" : ""}`}>
      <div className={`claude-cell ${isDone ? "claude-done" : ""}`} style={{ width: widths[0], flexShrink: 0, paddingLeft: 56, position: "relative" }}>
        <EditableText
          value={node.name}
          onSave={(v) => startTransition(() => updateTaskField(node.key, "task", v))}
        />
        <ColResizer index={0} />
      </div>
      <div className="claude-cell" style={{ width: widths[1], flexShrink: 0, justifyContent: "center", position: "relative" }}>
        <StatusSelect value={node.taskStatus} recordId={node.key} />
        <ColResizer index={1} />
      </div>
      <div className="claude-cell" style={{ width: widths[2], flexShrink: 0, position: "relative" }}>
        <EditableText
          value={node.taskResult || ""}
          onSave={(v) => startTransition(() => updateTaskField(node.key, "taskResult", v))}
        />
        <ColResizer index={2} />
      </div>
      <div className="claude-cell" style={{ flex: 1, minWidth: widths[3] }}>
        <EditableText
          value={node.taskNotes || ""}
          onSave={(v) => startTransition(() => updateTaskField(node.key, "taskNotes", v))}
          className="claude-notes-text"
        />
      </div>
    </div>
  );
}

function ProjectNode({ node }: { node: TreeTask }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="claude-project">
      <div className="claude-project-header" onClick={() => setOpen(!open)}>
        <span className="claude-chevron">{open ? "▾" : "▸"}</span>
        <span className="claude-project-name">{node.name}</span>
        <TickleBadge date={node.tickleDate || undefined} taskIds={node.taskIds || []} />
        <span className="claude-task-count">{node.children?.length}</span>
      </div>
      {open && node.children && (
        <div className="claude-task-list">
          {node.children.map((task) => (
            <TaskRow key={task.key} node={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function UberNode({ node }: { node: TreeTask }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="claude-uber">
      <div className="claude-uber-header" onClick={() => setOpen(!open)}>
        <span className="claude-chevron">{open ? "▾" : "▸"}</span>
        <span className="claude-uber-name">{node.name}</span>
      </div>
      {open && node.children && (
        <div className="claude-uber-children">
          {node.children.map((project) => (
            <ProjectNode key={project.key} node={project} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClaudeTree({
  treeData,
  taskCount,
}: {
  treeData: TreeTask[];
  taskCount: number;
}) {
  
  const [widths, setWidths] = useState([300, 120, 150, 200]);
  const onResize = useCallback((i: number, delta: number) => {
    setWidths((prev) => {
      const next = [...prev];
      next[i] = Math.max(60, next[i] + delta);
      return next;
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--foreground)" }}>
      <div className="claude-container">
        <div className="claude-header">
          <h1 className="claude-title">Projects</h1>
          <div className="claude-header-right">
            <span className="claude-count">{taskCount} tasks</span>
          </div>
        </div>

        {/* Column headers */}
        <div className="claude-col-headers">
          <div className="claude-col-header" style={{ width: widths[0], position: "relative" }}>Task<ColResizer index={0} /></div>
          <div className="claude-col-header" style={{ width: widths[1], textAlign: "center", position: "relative" }}>Status<ColResizer index={1} /></div>
          <div className="claude-col-header" style={{ width: widths[2], position: "relative" }}>Result<ColResizer index={2} /></div>
          <div className="claude-col-header" style={{ flex: 1, minWidth: widths[3] }}>Notes</div>
        </div>

        <ColContext.Provider value={{ widths, onResize }}>
        <div className="claude-tree-card">
          {treeData.map((uber) => (
            <UberNode key={uber.key} node={uber} />
          ))}
        </div>
        </ColContext.Provider>
      </div>

      <style>{`
        .claude-container {
          max-width: 100%;
          padding: 32px 48px;
        }

        .claude-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .claude-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .claude-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .claude-count {
          font-size: 14px;
          color: var(--muted-foreground);
        }

        .claude-mode-toggle {
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 6px 12px;
          cursor: pointer;
          font-size: 16px;
        }

        .claude-col-headers {
          display: flex;
          align-items: center;
          padding: 10px 16px 10px 56px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--muted-foreground);
          background: var(--muted);
          border-radius: var(--radius) var(--radius) 0 0;
          border: 1px solid var(--border);
          border-bottom: 2px solid var(--border);
        }

        .claude-col-header {
          flex-shrink: 0;
        }

        .claude-tree-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-top: 0;
          border-radius: 0 0 var(--radius) var(--radius);
          overflow: hidden;
        }

        .claude-uber {
          border-bottom: 1px solid var(--border);
        }

        .claude-uber:last-child {
          border-bottom: none;
        }

        .claude-uber-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 16px;
          cursor: pointer;
          background: var(--muted);
          transition: background 0.15s;
        }

        .claude-uber-header:hover {
          background: var(--accent);
        }

        .claude-uber-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .claude-chevron {
          width: 16px;
          text-align: center;
          color: var(--muted-foreground);
          font-size: 14px;
          user-select: none;
        }

        .claude-uber-children {
          padding-left: 0;
        }

        .claude-project {
          border-bottom: 1px solid var(--border);
        }

        .claude-project:last-child {
          border-bottom: none;
        }

        .claude-project-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 32px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .claude-project-header:hover {
          background: var(--accent);
        }

        .claude-project-name {
          font-size: 14px;
          font-weight: 600;
        }

        .claude-task-count {
          font-size: 11px;
          color: var(--muted-foreground);
          background: var(--secondary);
          border-radius: 999px;
          padding: 1px 8px;
          font-weight: 500;
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

        .claude-badge:hover {
          opacity: 0.8;
        }

        .claude-badge-overdue {
          background: #c96442;
          color: white;
        }

        .claude-badge-soon {
          background: #e8a87c;
          color: #3d3929;
        }

        .claude-badge-ok {
          background: var(--secondary);
          color: var(--secondary-foreground);
          border: 1px solid var(--border);
        }

        .claude-badge-none {
          background: var(--muted);
          color: var(--muted-foreground);
        }

        .claude-task-list {
          border-top: 1px solid var(--border);
        }

        .claude-task-row {
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid var(--border);
          transition: background 0.1s;
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


        .claude-done {
          text-decoration: line-through;
          color: var(--muted-foreground);
        }

        .claude-editable {
          cursor: text;
          padding: 2px 4px;
          margin: -2px -4px;
          border-radius: 4px;
          transition: background 0.1s;
          word-break: break-word;
        }

        .claude-editable:hover {
          background: var(--muted);
        }

        .claude-empty {
          color: var(--muted-foreground);
          opacity: 0.4;
        }

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

        .claude-notes-text {
          color: var(--muted-foreground);
          font-style: italic;
        }

        .claude-pending {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
