"use client";

import { useState } from "react";

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
        className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 cursor-pointer group`}
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
            {node.data.tickleDate && (
              <span
                className={`text-xs font-mono whitespace-nowrap ${tickleColor(node.data.tickleDate)}`}
              >
                {formatDate(node.data.tickleDate)}
              </span>
            )}
          </div>
        )}

        {node.data.type === "task" && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`text-sm ${node.data.taskStatus === "Done" ? "line-through text-muted-foreground" : ""}`}
            >
              {node.name}
            </span>
            {statusBadge(node.data.taskStatus)}
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
