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
import { PillSelect, type PillOption } from "@/components/pill";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import { Empty } from "@/components/empty";
import { useTableViews, resolveColumnOrder } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  updateBacklogMainEntry,
  updateBacklogDetails,
  updateBacklogPriority,
  updateBacklogCategory,
  updateBacklogYesOrNotYet,
  updateBacklogDesignParadigm,
  updateBacklogStatus,
  updateBacklogPrototypeStage,
  createBacklogItem,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createPriority = (name: string) =>
  createPicklistOptionNamed("backlog_priorities", name);
const createCategory = (name: string) =>
  createPicklistOptionNamed("backlog_categories", name);
const createYesOrNotYet = (name: string) =>
  createPicklistOptionNamed("backlog_yes_or_not_yet", name);
const createDesignParadigm = (name: string) =>
  createPicklistOptionNamed("backlog_design_paradigms", name);
const createStatus = (name: string) =>
  createPicklistOptionNamed("backlog_statuses", name);
const createPrototypeStage = (name: string) =>
  createPicklistOptionNamed("backlog_prototype_stages", name);

export interface BacklogRow {
  id: string;
  main_entry: string | null;
  details: string | null;
  image_url: string | null;
  priority_id: string | null;
  primary_category_id: string | null;
  yes_or_not_yet_id: string | null;
  design_paradigm_id: string | null;
  status_id: string | null;
  prototype_stage_id: string | null;
}

const COLUMN_KEYS = [
  "main_entry",
  "priority",
  "category",
  "status",
  "yes_or_not_yet",
  "design_paradigm",
  "prototype_stage",
  "details",
  "image",
] as const;

const DEFAULT_WIDTHS: Record<string, number> = {
  main_entry: 320,
  priority: 200,
  category: 200,
  status: 200,
  yes_or_not_yet: 110,
  design_paradigm: 140,
  prototype_stage: 120,
  details: 360,
  image: 80,
};

const HEADER_LABELS: Record<string, string> = {
  main_entry: "Main Entry",
  priority: "Priority",
  category: "Primary Category",
  status: "Status",
  yes_or_not_yet: "Yes or Not Yet",
  design_paradigm: "Design Paradigm",
  prototype_stage: "Prototype Stage",
  details: "Details",
  image: "Image",
};

function NewBacklogRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createBacklogItem());
        }}
        title="Create a new backlog item"
      >
        {pending ? "Creating…" : "+ New backlog item"}
      </td>
    </tr>
  );
}

export function BacklogTable({
  rows,
  priorityOptions,
  categoryOptions,
  yesOrNotYetOptions,
  designParadigmOptions,
  statusOptions,
  prototypeStageOptions,
}: {
  rows: BacklogRow[];
  priorityOptions: PillOption[];
  categoryOptions: PillOption[];
  yesOrNotYetOptions: PillOption[];
  designParadigmOptions: PillOption[];
  statusOptions: PillOption[];
  prototypeStageOptions: PillOption[];
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
  } = useTableViews("backlog", DEFAULT_WIDTHS);

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

  const cellRenderers: Record<string, (row: BacklogRow) => React.ReactNode> = {
    main_entry: (row) => (
      <td key="main_entry" className={`${cellClass} text-foreground`}>
        <EditableText
          value={row.main_entry ?? ""}
          onSave={(v) => updateBacklogMainEntry(row.id, v)}
        />
      </td>
    ),
    priority: (row) => (
      <td key="priority" className={cellClass}>
        <PillSelect
          value={row.priority_id ?? ""}
          options={priorityOptions}
          onSave={(v) => updateBacklogPriority(row.id, v)}
          onCreate={createPriority}
        />
      </td>
    ),
    category: (row) => (
      <td key="category" className={cellClass}>
        <PillSelect
          value={row.primary_category_id ?? ""}
          options={categoryOptions}
          onSave={(v) => updateBacklogCategory(row.id, v)}
          onCreate={createCategory}
        />
      </td>
    ),
    status: (row) => (
      <td key="status" className={cellClass}>
        <PillSelect
          value={row.status_id ?? ""}
          options={statusOptions}
          onSave={(v) => updateBacklogStatus(row.id, v)}
          onCreate={createStatus}
        />
      </td>
    ),
    yes_or_not_yet: (row) => (
      <td key="yes_or_not_yet" className={cellClass}>
        <PillSelect
          value={row.yes_or_not_yet_id ?? ""}
          options={yesOrNotYetOptions}
          onSave={(v) => updateBacklogYesOrNotYet(row.id, v)}
          onCreate={createYesOrNotYet}
        />
      </td>
    ),
    design_paradigm: (row) => (
      <td key="design_paradigm" className={cellClass}>
        <PillSelect
          value={row.design_paradigm_id ?? ""}
          options={designParadigmOptions}
          onSave={(v) => updateBacklogDesignParadigm(row.id, v)}
          onCreate={createDesignParadigm}
        />
      </td>
    ),
    prototype_stage: (row) => (
      <td key="prototype_stage" className={cellClass}>
        <PillSelect
          value={row.prototype_stage_id ?? ""}
          options={prototypeStageOptions}
          onSave={(v) => updateBacklogPrototypeStage(row.id, v)}
          onCreate={createPrototypeStage}
        />
      </td>
    ),
    details: (row) => (
      <td key="details" className={cellClass}>
        <EditableTextWrap
          value={row.details ?? ""}
          onSave={(v) => updateBacklogDetails(row.id, v)}
        />
      </td>
    ),
    image: (row) => (
      <td key="image" className={cellClass}>
        {row.image_url ? (
          <a
            href={row.image_url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.image_url}
              alt=""
              style={{
                maxWidth: "100%",
                maxHeight: 48,
                borderRadius: "var(--radius-sm)",
                objectFit: "cover",
              }}
            />
          </a>
        ) : (
          <Empty />
        )}
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
            onKeyDown={handleGridKeyDown}
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
              <NewBacklogRow colSpan={orderedKeys.length} />
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
