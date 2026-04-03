"use client";

import { useState, useTransition } from "react";
import { updateTickleDate } from "./actions";

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

function OutlineNode({
  node,
  depth = 0,
}: {
  node: TreeNode;
  depth?: number;
}) {
  const [open, setOpen] = useState(node.data.type !== "task");
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 24;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 hover:bg-accent/50 cursor-pointer group ${node.data.type === "task" ? "border-b" : "rounded"}`}
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
          <div className="flex items-center flex-1 min-w-0 -my-1.5 -mr-2">
            <span
              className={`text-sm px-2 py-1.5 border-r w-[280px] truncate flex-shrink-0 ${node.data.taskStatus === "Done" ? "line-through text-muted-foreground" : ""}`}
            >
              {node.name}
            </span>
            <span className="w-[80px] flex-shrink-0 px-2 py-1.5 border-r text-center">
              {statusBadge(node.data.taskStatus)}
            </span>
            <span className="text-xs text-muted-foreground px-2 py-1.5 border-r w-[140px] truncate flex-shrink-0">
              {node.data.taskResult || ""}
            </span>
            <span className="text-xs text-muted-foreground/70 italic px-2 py-1.5 truncate">
              {node.data.taskNotes || ""}
            </span>
          </div>
        )}
      </div>

      {open &&
        hasChildren &&
        node.children!.map((child) => (
          <OutlineNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export function ProjectOutline({ initialData }: { initialData: TreeNode[] }) {
  return (
    <div className="border rounded-lg bg-card p-2">
      {initialData.map((node) => (
        <OutlineNode key={node.id} node={node} />
      ))}
    </div>
  );
}
