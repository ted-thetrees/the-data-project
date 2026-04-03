"use client";

import { useState, useTransition } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { updateTickleDate, updateTaskField } from "./actions";

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function tickleColor(d: string | null | undefined): string {
  if (!d) return "text-muted-foreground";
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "text-red-600 font-semibold";
  if (diff < 3) return "text-orange-600 font-semibold";
  return "text-muted-foreground";
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
        className={`w-full bg-background border rounded px-1 py-0.5 outline-none ${className || "text-sm"}`}
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
      className={`cursor-text hover:bg-accent/80 rounded px-0.5 -mx-0.5 ${className || "text-sm"}`}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {value || "\u00A0"}
    </span>
  );
}

function Node({ node, style, dragHandle }: NodeRendererProps<any>) {
  const data = node.data;
  const [isPending, startTransition] = useTransition();
  const [editingDate, setEditingDate] = useState(false);

  const handleFieldSave = (field: string, value: string) => {
    startTransition(() => updateTaskField(data.id, field, value));
  };

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`flex items-center gap-2 py-1 px-2 hover:bg-accent/50 cursor-pointer group
        ${data.nodeType === "task" ? "border-b" : ""}
        ${isPending ? "opacity-50" : ""}`}
      onClick={() => node.isInternal && node.toggle()}
    >
      {/* Collapse/expand or bullet */}
      {node.isInternal ? (
        <span className="text-muted-foreground w-4 text-center text-xs select-none flex-shrink-0">
          {node.isOpen ? "▼" : "▶"}
        </span>
      ) : (
        <span className="w-4 text-center text-xs text-muted-foreground/40 flex-shrink-0">•</span>
      )}

      {/* Uber Project */}
      {data.nodeType === "uber" && (
        <span className="font-bold text-base">{data.name}</span>
      )}

      {/* Project */}
      {data.nodeType === "project" && (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-medium text-sm">{data.name}</span>
          {editingDate ? (
            <input
              type="date"
              defaultValue={toInputDate(data.tickleDate)}
              autoFocus
              className="text-xs font-mono border rounded px-1.5 py-0.5 bg-background"
              onBlur={(e) => {
                setEditingDate(false);
                const newDate = e.target.value;
                if (newDate && newDate !== toInputDate(data.tickleDate)) {
                  startTransition(() =>
                    updateTickleDate(data.taskIds, newDate + "T00:00:00.000Z")
                  );
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingDate(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`text-xs font-mono whitespace-nowrap cursor-pointer hover:underline ${tickleColor(data.tickleDate)}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditingDate(true);
              }}
            >
              {data.tickleDate ? formatDate(data.tickleDate) : "no date"}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {data.children?.length} tasks
          </span>
        </div>
      )}

      {/* Task */}
      {data.nodeType === "task" && (
        <div className="flex items-stretch flex-1 min-w-0 -my-1 -mr-2">
          {/* Task name */}
          <div
            className={`px-2 py-1 border-r break-words flex-shrink-0 ${data.taskStatus === "Done" ? "line-through text-muted-foreground" : ""}`}
            style={{ width: 300 }}
          >
            <EditableText
              value={data.name}
              onSave={(v) => handleFieldSave("task", v)}
            />
          </div>

          {/* Status */}
          <div className="w-[80px] flex-shrink-0 px-2 py-1 border-r text-center">
            <select
              value={data.taskStatus || ""}
              className="text-xs border rounded px-1 py-0.5 bg-transparent cursor-pointer"
              onChange={(e) => {
                e.stopPropagation();
                handleFieldSave("taskStatus", e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="Tickled">Tickled</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* Result */}
          <div className="px-2 py-1 border-r flex-shrink-0 break-words" style={{ width: 140 }}>
            <EditableText
              value={data.taskResult}
              onSave={(v) => handleFieldSave("taskResult", v)}
            />
          </div>

          {/* Notes */}
          <div className="px-2 py-1 flex-1 break-words">
            <EditableText
              value={data.taskNotes}
              onSave={(v) => handleFieldSave("taskNotes", v)}
              className="text-sm text-muted-foreground/70 italic"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ArboristTree({ initialData }: { initialData: any[] }) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Column headers */}
      <div
        className="flex items-center border-b-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        style={{ paddingLeft: 80 }}
      >
        <div className="px-2 py-1.5 border-r" style={{ width: 300 }}>Task</div>
        <div className="w-[80px] px-2 py-1.5 border-r text-center">Status</div>
        <div className="px-2 py-1.5 border-r" style={{ width: 140 }}>Result</div>
        <div className="px-2 py-1.5 flex-1">Notes</div>
      </div>

      <Tree
        data={initialData}
        openByDefault={true}
        width="100%"
        height={800}
        rowHeight={36}
        indent={24}
        disableDrag={false}
        disableDrop={false}
        disableEdit={true}
        onMove={({ dragIds, parentId, index }) => {
          console.log("Move:", dragIds, "to", parentId, "at", index);
        }}
      >
        {Node}
      </Tree>
    </div>
  );
}
