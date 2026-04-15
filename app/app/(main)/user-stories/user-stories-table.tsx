"use client";

import { useMemo, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  PillSelect,
  MultiPillSelect,
  type PillOption,
} from "@/components/pill";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import { useTableViews, resolveColumnOrder } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import {
  updateUserStoryTitle,
  updateUserStoryNarrative,
  updateUserStoryCategory,
  addUserStoryRole,
  removeUserStoryRole,
  createUserStory,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createUserStoryRoleOption = (name: string) =>
  createPicklistOptionNamed("user_story_roles", name);
const createUserStoryCategoryOption = (name: string) =>
  createPicklistOptionNamed("user_story_categories", name);

export interface UserStoryRow {
  id: string;
  title: string;
  narrative: string | null;
  category_id: string | null;
  roles: Array<{ id: string; name: string }>;
}

const COLUMN_KEYS = ["as", "narrative", "title", "category"] as const;

const DEFAULT_WIDTHS: Record<string, number> = {
  as: 280,
  narrative: 560,
  title: 240,
  category: 180,
};

const HEADER_LABELS: Record<string, string> = {
  as: "As",
  narrative: "Narrative",
  title: "Title",
  category: "Category",
};

function NewUserStoryRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createUserStory());
        }}
        title="Create a new user story"
      >
        {pending ? "Creating…" : "+ New user story"}
      </td>
    </tr>
  );
}

export function UserStoriesTable({
  rows,
  roleOptions,
  categoryOptions,
}: {
  rows: UserStoryRow[];
  roleOptions: PillOption[];
  categoryOptions: PillOption[];
}) {
  const {
    views,
    activeViewId,
    params,
    switchView,
    createView,
    renameView,
    deleteView,
    setColumnWidth,
    setColumnOrder,
  } = useTableViews("user-stories", DEFAULT_WIDTHS);

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        COLUMN_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedKeys.indexOf(String(active.id));
    const newIndex = orderedKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
  };

  const totalWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: UserStoryRow) => React.ReactNode> =
    {
      as: (row) => (
        <td key="as" className={cellClass}>
          <MultiPillSelect
            value={row.roles.map((r) => r.id)}
            options={roleOptions}
            onAdd={(id) => addUserStoryRole(row.id, id)}
            onRemove={(id) => removeUserStoryRole(row.id, id)}
            onCreate={createUserStoryRoleOption}
          />
        </td>
      ),
      narrative: (row) => (
        <td key="narrative" className={cellClass}>
          <EditableTextWrap
            value={row.narrative ?? ""}
            onSave={(v) => updateUserStoryNarrative(row.id, v)}
          />
        </td>
      ),
      title: (row) => (
        <td key="title" className={`${cellClass} text-foreground`}>
          <EditableText
            value={row.title}
            onSave={(v) => updateUserStoryTitle(row.id, v)}
          />
        </td>
      ),
      category: (row) => (
        <td key="category" className={cellClass}>
          <PillSelect
            value={row.category_id ?? ""}
            options={categoryOptions}
            onSave={(v) => updateUserStoryCategory(row.id, v)}
            onCreate={createUserStoryCategoryOption}
          />
        </td>
      ),
    };

  return (
    <>
      <ViewSwitcher
        views={views}
        activeViewId={activeViewId}
        onSwitch={switchView}
        onCreate={createView}
        onRename={renameView}
        onDelete={deleteView}
      />
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table
            className="text-[length:var(--cell-font-size)] [&_td]:align-top"
            style={{
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: "var(--row-gap)",
              width: totalWidth,
            }}
          >
            <colgroup>
              {orderedKeys.map((key) => (
                <col key={key} style={{ width: params.columnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <SortableContext
                  items={orderedKeys}
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedKeys.map((key, i) => (
                    <SortableHeaderCell
                      key={key}
                      id={key}
                      className={headerClass}
                      extras={
                        <ColumnResizer
                          columnIndex={i}
                          currentWidth={params.columnWidths[key]}
                          onResize={(w) => setColumnWidth(key, w)}
                        />
                      }
                    >
                      {HEADER_LABELS[key]}
                    </SortableHeaderCell>
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              <tr aria-hidden="true">
                <td
                  colSpan={orderedKeys.length}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              <NewUserStoryRow colSpan={orderedKeys.length} />
              <tr aria-hidden="true">
                <td
                  colSpan={orderedKeys.length}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              {rows.map((row) => (
                <tr key={row.id}>
                  {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                </tr>
              ))}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
