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
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { RowContextMenu } from "@/components/row-context-menu";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  updateUserStoryTitle,
  updateUserStoryNarrative,
  updateUserStoryCategory,
  addUserStoryRole,
  removeUserStoryRole,
  createUserStory,
  deleteUserStory,
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

import {
  USER_STORIES_STORAGE_KEY,
  USER_STORIES_DEFAULT_WIDTHS,
} from "./config";

const COLUMN_KEYS = ["as", "narrative", "title", "category"] as const;

const DEFAULT_WIDTHS = USER_STORIES_DEFAULT_WIDTHS;

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
  initialParams,
}: {
  rows: UserStoryRow[];
  roleOptions: PillOption[];
  categoryOptions: PillOption[];
  initialParams?: ViewParams;
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
  } = useTableViews(USER_STORIES_STORAGE_KEY, DEFAULT_WIDTHS, initialParams);

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
            onKeyDown={handleGridKeyDown}
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
                <RowContextMenu
                  key={row.id}
                  onDelete={() => deleteUserStory(row.id)}
                  itemLabel={row.title ? `"${row.title}"` : "this user story"}
                >
                  {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                </RowContextMenu>
              ))}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
