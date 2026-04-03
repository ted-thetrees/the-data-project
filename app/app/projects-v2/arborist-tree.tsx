"use client";

import { useState, useTransition } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { updateTickleDate, updateTaskField } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  if (diff < 0) return "text-destructive font-semibold";
  if (diff < 3) return "text-orange-600 font-semibold";
  return "text-muted-foreground";
}

function statusVariant(status: string | undefined): "default" | "secondary" | "outline" | "destructive" {
  if (status === "Done") return "default";
  if (status === "Tickled") return "secondary";
  return "outline";
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
      <Input
        type="text"
        defaultValue={value}
        autoFocus
        className={`h-7 text-sm ${className || ""}`}
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
      className={`cursor-text hover:bg-accent rounded px-1 -mx-1 ${className || ""}`}
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
        ${data.nodeType === "task" ? "border-b border-border" : ""}
        ${isPending ? "opacity-50" : ""}`}
      onClick={() => node.isInternal && node.toggle()}
    >
      {node.isInternal ? (
        <span className="text-muted-foreground w-4 text-center text-xs select-none flex-shrink-0">
          {node.isOpen ? "▼" : "▶"}
        </span>
      ) : (
        <span className="w-4 text-center text-xs text-muted-foreground/40 flex-shrink-0">•</span>
      )}

      {data.nodeType === "uber" && (
        <span className="font-bold text-base text-foreground">{data.name}</span>
      )}

      {data.nodeType === "project" && (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-medium text-sm text-foreground">{data.name}</span>
          {editingDate ? (
            <Input
              type="date"
              defaultValue={toInputDate(data.tickleDate)}
              autoFocus
              className="h-6 w-36 text-xs font-mono"
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
            <Badge
              variant="outline"
              className={`cursor-pointer hover:bg-accent font-mono ${tickleColor(data.tickleDate)}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditingDate(true);
              }}
            >
              {data.tickleDate ? formatDate(data.tickleDate) : "no date"}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {data.children?.length} tasks
          </span>
        </div>
      )}

      {data.nodeType === "task" && (
        <div className="flex items-stretch flex-1 min-w-0 -my-1 -mr-2">
          <div
            className={`px-2 py-1 border-r border-border break-words flex-shrink-0 text-sm ${data.taskStatus === "Done" ? "line-through text-muted-foreground" : "text-foreground"}`}
            style={{ width: 300 }}
          >
            <EditableText
              value={data.name}
              onSave={(v) => handleFieldSave("task", v)}
            />
          </div>

          <div
            className="w-[100px] flex-shrink-0 px-2 py-1 border-r border-border flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={data.taskStatus || "Tickled"}
              onValueChange={(v) => handleFieldSave("taskStatus", v)}
            >
              <SelectTrigger className="h-6 w-full text-xs border-0 shadow-none bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tickled">Tickled</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="px-2 py-1 border-r border-border flex-shrink-0 break-words text-sm" style={{ width: 140 }}>
            <EditableText
              value={data.taskResult}
              onSave={(v) => handleFieldSave("taskResult", v)}
            />
          </div>

          <div className="px-2 py-1 flex-1 break-words">
            <EditableText
              value={data.taskNotes}
              onSave={(v) => handleFieldSave("taskNotes", v)}
              className="text-sm text-muted-foreground italic"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ArboristTree({ initialData }: { initialData: any[] }) {
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div
        className="flex items-center border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30"
        style={{ paddingLeft: 80 }}
      >
        <div className="px-2 py-2 border-r border-border" style={{ width: 300 }}>Task</div>
        <div className="w-[100px] px-2 py-2 border-r border-border text-center">Status</div>
        <div className="px-2 py-2 border-r border-border" style={{ width: 140 }}>Result</div>
        <div className="px-2 py-2 flex-1">Notes</div>
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
