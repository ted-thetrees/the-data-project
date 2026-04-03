"use client";

import { useState, useTransition, useMemo } from "react";
import { syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature, dragAndDropFeature } from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
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

interface TreeItem {
  itemName: string;
  nodeType: "uber" | "project" | "task";
  childrenIds: string[];
  tickleDate?: string;
  taskIds?: string[];
  taskStatus?: string;
  taskResult?: string;
  taskNotes?: string;
}

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

export function HeadlessTree({ initialData }: { initialData: Record<string, TreeItem> }) {
  const [data] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const tree = useTree<TreeItem>({
    rootItemId: "root",
    getItemName: (item) => item.getItemData().itemName,
    isItemFolder: (item) => item.getItemData().childrenIds.length > 0,
    dataLoader: {
      getItem: (itemId) => data[itemId],
      getChildren: (itemId) => data[itemId]?.childrenIds || [],
    },
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
    ],
  });

  const handleFieldSave = (recordId: string, field: string, value: string) => {
    startTransition(() => updateTaskField(recordId, field, value));
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Column headers */}
      <div
        className="flex items-center border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30"
        style={{ paddingLeft: 80 }}
      >
        <div className="px-2 py-2 border-r border-border" style={{ width: 300 }}>Task</div>
        <div className="w-[100px] px-2 py-2 border-r border-border text-center">Status</div>
        <div className="px-2 py-2 border-r border-border" style={{ width: 140 }}>Result</div>
        <div className="px-2 py-2 flex-1">Notes</div>
      </div>

      {/* Tree */}
      <div {...tree.getContainerProps("Project tree")} className={isPending ? "opacity-50" : ""}>
        {tree.getItems().map((item) => {
          const itemData = item.getItemData();
          const meta = item.getItemMeta();
          const indent = meta.level * 24;
          const isFolder = itemData.childrenIds.length > 0;

          return (
            <div
              key={item.getId()}
              {...item.getProps()}
              className={`flex items-center gap-2 py-1.5 px-2 hover:bg-accent/50 cursor-pointer outline-none
                ${item.isSelected() ? "bg-accent" : ""}
                ${itemData.nodeType === "task" ? "border-b border-border" : ""}`}
              style={{ paddingLeft: indent + 8 }}
            >
              {/* Collapse/expand or bullet */}
              {isFolder ? (
                <span
                  className="text-muted-foreground w-4 text-center text-xs select-none flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.isExpanded() ? item.collapse() : item.expand();
                  }}
                >
                  {item.isExpanded() ? "▼" : "▶"}
                </span>
              ) : (
                <span className="w-4 text-center text-xs text-muted-foreground/40 flex-shrink-0">•</span>
              )}

              {/* Uber project */}
              {itemData.nodeType === "uber" && (
                <span className="font-bold text-base text-foreground">{itemData.itemName}</span>
              )}

              {/* Project */}
              {itemData.nodeType === "project" && (() => {
                const [editingDate, setEditingDate] = useState(false);
                return (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{itemData.itemName}</span>
                    {editingDate ? (
                      <Input
                        type="date"
                        defaultValue={toInputDate(itemData.tickleDate)}
                        autoFocus
                        className="h-6 w-36 text-xs font-mono"
                        onBlur={(e) => {
                          setEditingDate(false);
                          const newDate = e.target.value;
                          if (newDate && newDate !== toInputDate(itemData.tickleDate)) {
                            startTransition(() =>
                              updateTickleDate(itemData.taskIds || [], newDate + "T00:00:00.000Z")
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
                        className={`cursor-pointer hover:bg-accent font-mono ${tickleColor(itemData.tickleDate)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDate(true);
                        }}
                      >
                        {itemData.tickleDate ? formatDate(itemData.tickleDate) : "no date"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {itemData.childrenIds.length} tasks
                    </span>
                  </div>
                );
              })()}

              {/* Task */}
              {itemData.nodeType === "task" && (
                <div className="flex items-stretch flex-1 min-w-0 -my-1.5 -mr-2">
                  <div
                    className={`px-2 py-1.5 border-r border-border break-words flex-shrink-0 text-sm ${itemData.taskStatus === "Done" ? "line-through text-muted-foreground" : "text-foreground"}`}
                    style={{ width: 300 }}
                  >
                    <EditableText
                      value={itemData.itemName}
                      onSave={(v) => handleFieldSave(item.getId()!, "task", v)}
                    />
                  </div>

                  <div
                    className="w-[100px] flex-shrink-0 px-2 py-1.5 border-r border-border flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={itemData.taskStatus || "Tickled"}
                      onValueChange={(v) => v && handleFieldSave(item.getId()!, "taskStatus", v)}
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

                  <div className="px-2 py-1.5 border-r border-border flex-shrink-0 break-words text-sm" style={{ width: 140 }}>
                    <EditableText
                      value={itemData.taskResult || ""}
                      onSave={(v) => handleFieldSave(item.getId()!, "taskResult", v)}
                    />
                  </div>

                  <div className="px-2 py-1.5 flex-1 break-words">
                    <EditableText
                      value={itemData.taskNotes || ""}
                      onSave={(v) => handleFieldSave(item.getId()!, "taskNotes", v)}
                      className="text-sm text-muted-foreground italic"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
