"use client";

import { useState, useTransition, useCallback, useRef, createContext, useContext } from "react";
import { updateTickleDate, updateTaskField } from "./actions";

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  data: {
    type: "uber" | "project" | "task";
    tickleDate?: string;
    projectStatus?: string;
    projectNotes?: string;
    taskIds?: string[];
    taskStatus?: string;
    taskResult?: string | null;
    taskNotes?: string | null;
  };
}

const ColumnsContext = createContext<{
  widths: number[];
  onResize: (index: number, delta: number) => void;
}>({ widths: [300, 80, 140, 200], onResize: () => {} });

function ColumnResizer({ index }: { index: number }) {
  const { onResize } = useContext(ColumnsContext);
  const startX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;

      const onMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX.current;
        startX.current = e.clientX;
        onResize(index, delta);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [index, onResize]
  );

  return (
    <div
      className="absolute top-0 bottom-0 w-[5px] cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-10"
      style={{ right: -2 }}
      onMouseDown={onMouseDown}
    />
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().split("T")[0];
}

function tickleColor(d: string | null | undefined): string {
  if (!d) return "text-muted-foreground";
  const date = new Date(d);
  const now = new Date();
  const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "text-red-600 font-semibold";
  if (diff < 3) return "text-orange-600 font-semibold";
  return "text-muted-foreground";
}

function statusBadge(status: string | undefined) {
  if (!status) return null;
  const colors: Record<string, string> = {
    Done: "bg-green-100 text-green-800 border-green-300",
    Tickled: "bg-yellow-100 text-yellow-800 border-yellow-300",
  };
  return (
    <span
      className={`text-xs rounded-full px-2 py-0.5 border ${colors[status] || "bg-gray-100 text-gray-700 border-gray-300"}`}
    >
      {status}
    </span>
  );
}

function EditableText({
  value,
  recordId,
  field,
  className,
}: {
  value: string;
  recordId: string;
  field: "task" | "taskResult" | "taskNotes";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input
        type="text"
        defaultValue={value}
        autoFocus
        className={`w-full bg-background border rounded px-1 py-0.5 text-sm outline-none ${className || ""}`}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) {
            startTransition(() => updateTaskField(recordId, field, e.target.value));
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
      className={`cursor-text hover:bg-accent/80 rounded px-0.5 -mx-0.5 ${isPending ? "opacity-50" : ""} ${className || ""}`}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {value || "\u00A0"}
    </span>
  );
}

function EditableStatus({
  value,
  recordId,
}: {
  value: string | undefined;
  recordId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <select
        defaultValue={value || ""}
        autoFocus
        className="text-xs border rounded px-1 py-0.5 bg-background outline-none"
        onChange={(e) => {
          setEditing(false);
          if (e.target.value !== value) {
            startTransition(() => updateTaskField(recordId, "taskStatus", e.target.value));
          }
        }}
        onBlur={() => setEditing(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="Tickled">Tickled</option>
        <option value="Done">Done</option>
      </select>
    );
  }

  return (
    <span
      className={`cursor-pointer ${isPending ? "opacity-50" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {statusBadge(value) || <span className="text-xs text-muted-foreground/40">set status</span>}
    </span>
  );
}

function EditableDate({
  date,
  taskIds,
}: {
  date: string | undefined;
  taskIds: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={toInputDate(date)}
        autoFocus
        className="text-xs font-mono border rounded px-1.5 py-0.5 bg-background"
        onBlur={(e) => {
          setEditing(false);
          const newDate = e.target.value;
          if (newDate && newDate !== toInputDate(date)) {
            startTransition(() => {
              updateTickleDate(taskIds, newDate + "T00:00:00.000Z");
            });
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
      className={`text-xs font-mono whitespace-nowrap cursor-pointer hover:underline ${isPending ? "opacity-50" : tickleColor(date)}`}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {date ? formatDate(date) : "no date"}
    </span>
  );
}

const COLUMN_HEADERS = ["Task", "Status", "Result", "Notes"];
const MIN_COL_WIDTH = 50;

function ColumnHeaders() {
  const { widths } = useContext(ColumnsContext);

  return (
    <div className="flex items-center border-b-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ paddingLeft: 80 }}>
      {COLUMN_HEADERS.map((header, i) => (
        <div
          key={header}
          className={`relative px-2 py-1.5 border-r last:border-r-0 truncate ${i === COLUMN_HEADERS.length - 1 ? "flex-1" : ""}`}
          style={i < COLUMN_HEADERS.length - 1 ? { width: widths[i], flexShrink: 0 } : { minWidth: widths[i] }}
        >
          {header}
          {i < COLUMN_HEADERS.length - 1 && <ColumnResizer index={i} />}
        </div>
      ))}
    </div>
  );
}

function OutlineNode({
  node,
  depth = 0,
  isFirstChild = false,
}: {
  node: TreeNode;
  depth?: number;
  isFirstChild?: boolean;
}) {
  const [open, setOpen] = useState(node.data.type !== "task");
  const { widths } = useContext(ColumnsContext);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 24;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 hover:bg-accent/50 cursor-pointer group ${node.data.type === "task" ? `border-b ${isFirstChild ? "border-t" : ""}` : "rounded"}`}
        style={{ paddingLeft: indent + 8 }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          <span className="text-muted-foreground w-4 text-center text-xs select-none">
            {open ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-4 text-center text-xs text-muted-foreground/40">
            •
          </span>
        )}

        {node.data.type === "uber" && (
          <span className="font-bold text-base">{node.name}</span>
        )}

        {node.data.type === "project" && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-medium text-sm truncate">{node.name}</span>
            <EditableDate
              date={node.data.tickleDate}
              taskIds={node.data.taskIds || []}
            />
          </div>
        )}

        {node.data.type === "task" && (
          <div className="flex items-stretch flex-1 min-w-0 -my-1.5 -mr-2">
            <div
              className={`text-sm px-2 py-1.5 border-r flex-shrink-0 relative break-words ${node.data.taskStatus === "Done" ? "line-through text-muted-foreground" : ""}`}
              style={{ width: widths[0] }}
            >
              <EditableText value={node.name} recordId={node.id} field="task" />
              <ColumnResizer index={0} />
            </div>
            <div
              className="flex-shrink-0 px-2 py-1.5 border-r text-center relative"
              style={{ width: widths[1] }}
            >
              <EditableStatus value={node.data.taskStatus} recordId={node.id} />
              <ColumnResizer index={1} />
            </div>
            <div
              className="text-xs text-muted-foreground px-2 py-1.5 border-r flex-shrink-0 relative break-words"
              style={{ width: widths[2] }}
            >
              <EditableText value={node.data.taskResult || ""} recordId={node.id} field="taskResult" className="text-xs" />
              <ColumnResizer index={2} />
            </div>
            <div
              className="text-xs text-muted-foreground/70 italic px-2 py-1.5 flex-1 break-words"
              style={{ minWidth: widths[3] }}
            >
              <EditableText value={node.data.taskNotes || ""} recordId={node.id} field="taskNotes" className="text-xs italic" />
            </div>
          </div>
        )}
      </div>

      {open &&
        hasChildren &&
        node.children!.map((child, i) => (
          <OutlineNode key={child.id} node={child} depth={depth + 1} isFirstChild={i === 0} />
        ))}
    </div>
  );
}

export function ProjectOutline({ initialData }: { initialData: TreeNode[] }) {
  const [widths, setWidths] = useState([300, 80, 140, 200]);

  const onResize = useCallback((index: number, delta: number) => {
    setWidths((prev) => {
      const next = [...prev];
      next[index] = Math.max(MIN_COL_WIDTH, next[index] + delta);
      return next;
    });
  }, []);

  return (
    <ColumnsContext.Provider value={{ widths, onResize }}>
      <div className="border rounded-lg bg-card p-2 overflow-x-auto">
        <ColumnHeaders />
        {initialData.map((node) => (
          <OutlineNode key={node.id} node={node} />
        ))}
      </div>
    </ColumnsContext.Provider>
  );
}
