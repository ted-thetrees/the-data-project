"use client";

import { Fragment, useMemo, useTransition } from "react";
import Link from "next/link";
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
import { PageShell } from "@/components/page-shell";
import { Empty } from "@/components/empty";
import { EditableLink } from "@/components/editable-link";
import {
  Pill,
  PillSelect,
  MultiPillSelect,
  type PillOption,
} from "@/components/pill";
import { EditableText } from "@/components/editable-text";
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import { TALENT_STORAGE_KEY, TALENT_DEFAULT_WIDTHS } from "./config";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { RowContextMenu } from "@/components/row-context-menu";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
import {
  updateTalentCategory,
  updateTalentOverallRating,
  updateTalentName,
  updateTalentWebsite,
  updateTalentInstagram,
  createTalent,
  createTalentInArea,
  addTalentArea,
  removeTalentArea,
  deleteTalent,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";
import "./talent.css";

const createTalentCategoryOption = (name: string) =>
  createPicklistOptionNamed("talent_categories", name);
const createTalentRatingOption = (name: string) =>
  createPicklistOptionNamed("talent_rating_levels", name);
const createTalentAreaOption = (name: string) =>
  createPicklistOptionNamed("talent_areas", name);

// Default mode is ungrouped — same column set whether you're in the default
// view or grouping by area. Area mode prepends an icicle column.
const TALENT_COMMON_COLUMN_KEYS = [
  "category",
  "overall_rating",
  "resource",
  "website",
  "instagram",
  "areas",
  "notes",
] as const;

const TALENT_DEFAULT_MODE_KEYS = TALENT_COMMON_COLUMN_KEYS;

const TALENT_AREA_MODE_KEYS = [
  "area",
  ...TALENT_COMMON_COLUMN_KEYS,
] as const;


interface TalentRow {
  id: string;
  record_id: string;
  display_id: string;
  name: string;
  primary_talent_category: string | null;
  overall_rating: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  areas: string | null;
  areas_all: Array<{ id: string; name: string }>;
  area_id: string | null;
  area_name: string | null;
  area_color: string | null;
}

interface GroupSpan {
  value: string;
  rowSpan: number;
  startIndex: number;
  color: string | null;
}

function computeGroupSpans(
  data: TalentRow[],
  accessor: (row: TalentRow) => string,
  colorAccessor: (row: TalentRow) => string | null,
  parentAccessors?: ((row: TalentRow) => string)[],
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    let parentChanged = false;
    if (parentAccessors && i > 0) {
      parentChanged = parentAccessors.some(
        (pa) => (pa(data[i]) || "(none)") !== (pa(data[i - 1]) || "(none)"),
      );
    }
    if (!current || current.value !== val || parentChanged) {
      if (current) spans.push(current);
      current = {
        value: val,
        rowSpan: 1,
        startIndex: i,
        color: colorAccessor(row),
      };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
}

function IcicleCell({
  span,
  extraSpan = 0,
}: {
  span: GroupSpan;
  extraSpan?: number;
}) {
  return (
    <td
      rowSpan={span.rowSpan + extraSpan}
      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"
    >
      <Pill color={span.color}>{span.value}</Pill>
    </td>
  );
}

function GroupByControl({ current }: { current: "category" | "area" }) {
  const items: Array<{
    key: "category" | "area";
    label: string;
    href: string;
  }> = [
    { key: "category", label: "No grouping", href: "/talent" },
    { key: "area", label: "Area of expertise", href: "/talent?groupBy=area" },
  ];
  return (
    <div
      className="mb-3 flex items-center gap-2"
      style={{ fontSize: "var(--cell-font-size)" }}
    >
      <span className="text-muted-foreground">Group by:</span>
      {items.map((it) => {
        const active = it.key === current;
        return (
          <Link
            key={it.key}
            href={it.href}
            replace
            className={`px-2 py-1 rounded-sm border ${
              active
                ? "bg-foreground text-background border-foreground"
                : "border-muted-foreground/30 hover:border-foreground/50"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

function AddTalentRowArea({
  areaId,
  colSpan,
}: {
  areaId: string | null;
  colSpan: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (pending) return;
          startTransition(() =>
            areaId == null
              ? createTalent(null, null)
              : createTalentInArea(areaId),
          );
        }}
        title="Add talent in this area"
      >
        {pending ? "Adding…" : "+ Add talent"}
      </td>
    </tr>
  );
}

function NewTalentRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createTalent(null, null));
        }}
        title="Create a new talent with nothing pre-filled"
      >
        {pending ? "Creating…" : "+ New talent"}
      </td>
    </tr>
  );
}

export function TalentTable({
  data,
  recordCount,
  groupBy,
  categoryOptions,
  ratingOptions,
  areaOptions,
  initialParams,
}: {
  data: TalentRow[];
  recordCount: number;
  groupBy: "category" | "area";
  categoryOptions: PillOption[];
  ratingOptions: PillOption[];
  areaOptions: PillOption[];
  initialParams?: ViewParams;
}) {
  const sorted = data;

  // Area mode spans — pre-expanded rows already carry area_name, so a single
  // pass over computeGroupSpans produces one span per tag group. Records with
  // no tags get an "(Uncategorized)" span.
  const areaSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        (r) => r.area_name || "(Uncategorized)",
        (r) => r.area_color,
      ),
    [sorted],
  );
  const areaStartSet = new Set(areaSpans.map((s) => s.startIndex));
  const areaByIndex = Object.fromEntries(
    areaSpans.map((s) => [s.startIndex, s]),
  );
  const areaEndIndex = (start: number, span: number) => start + span - 1;
  const areaEndSet = new Set(
    areaSpans.map((s) => areaEndIndex(s.startIndex, s.rowSpan)),
  );
  const areaEndToAreaId: Record<number, string | null> = Object.fromEntries(
    areaSpans.map((s) => {
      const endIndex = areaEndIndex(s.startIndex, s.rowSpan);
      const lastRow = sorted[endIndex];
      return [endIndex, lastRow?.area_id ?? null];
    }),
  );

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
  } = useTableViews(TALENT_STORAGE_KEY, TALENT_DEFAULT_WIDTHS, initialParams);

  const orderedCommonKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        TALENT_COMMON_COLUMN_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCommonKeys.indexOf(String(active.id));
    const newIndex = orderedCommonKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedCommonKeys, oldIndex, newIndex));
  };

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const HEADER_LABELS: Record<string, string> = {
    area: "Area",
    category: "Category",
    overall_rating: "Overall Rating",
    resource: "Resource",
    website: "Website",
    instagram: "Instagram",
    areas: "Areas",
    notes: "Notes",
  };

  const columnKeys =
    groupBy === "area" ? ["area", ...orderedCommonKeys] : orderedCommonKeys;

  const totalWidth = columnKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );

  // Per-column cell renderers keyed by TALENT_COMMON_COLUMN_KEYS. renderRowBody
  // walks the (user-reordered) key list and emits cells in that order. The
  // "area" icicle column is rendered separately by the tbody loop in area mode.
  const commonCellRenderers: Record<
    string,
    (row: TalentRow) => React.ReactNode
  > = {
    category: (row) => (
      <td key="category" className={cellClass}>
        <PillSelect
          value={row.primary_talent_category ?? ""}
          options={categoryOptions}
          onSave={(v) => updateTalentCategory(row.record_id, v)}
          onCreate={createTalentCategoryOption}
        />
      </td>
    ),
    overall_rating: (row) => (
      <td key="overall_rating" className={cellClass}>
        <PillSelect
          value={row.overall_rating ?? ""}
          options={ratingOptions}
          onSave={(v) => updateTalentOverallRating(row.record_id, v)}
          onCreate={createTalentRatingOption}
        />
      </td>
    ),
    resource: (row) => (
      <td key="resource" className={`${cellClass} text-foreground`}>
        <EditableText
          value={row.name}
          onSave={(v) => updateTalentName(row.record_id, v)}
        />
      </td>
    ),
    website: (row) => (
      <td key="website" className={cellClass}>
        <EditableLink
          value={row.website}
          onSave={(v) => updateTalentWebsite(row.record_id, v)}
        />
      </td>
    ),
    instagram: (row) => (
      <td key="instagram" className={cellClass}>
        <EditableLink
          value={row.instagram}
          onSave={(v) => updateTalentInstagram(row.record_id, v)}
        />
      </td>
    ),
    areas: (row) => (
      <td key="areas" className={cellClass}>
        <MultiPillSelect
          value={row.areas_all.map((a) => a.id)}
          options={areaOptions}
          onAdd={(id) => addTalentArea(row.record_id, id)}
          onRemove={(id) => removeTalentArea(row.record_id, id)}
          onCreate={createTalentAreaOption}
        />
      </td>
    ),
    notes: (row) => (
      <td key="notes" className={cellClass}>
        {row.notes ? (
          <span
            className="truncate block max-w-[160px] text-muted-foreground"
            title={row.notes}
          >
            {row.notes}
          </span>
        ) : (
          <Empty />
        )}
      </td>
    ),
  };

  const renderRowBody = (row: TalentRow) => (
    <>{orderedCommonKeys.map((key) => commonCellRenderers[key]?.(row))}</>
  );

  return (
    <PageShell
      title="Talent"
      count={recordCount}
      displayRowCount={sorted.length}
      maxWidth=""
      className="talent-page"
    >
      <GroupByControl current={groupBy} />
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
            {columnKeys.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {groupBy === "area" && (
                <th key="area" className={headerClass}>
                  Area
                  <ColumnResizer
                    columnIndex={0}
                    currentWidth={params.columnWidths["area"]}
                    onResize={(w) => setColumnWidth("area", w)}
                  />
                </th>
              )}
              <SortableContext
                items={orderedCommonKeys}
                strategy={horizontalListSortingStrategy}
              >
                {orderedCommonKeys.map((key, i) => (
                  <SortableHeaderCell
                    key={key}
                    id={key}
                    className={headerClass}
                    extras={
                      <ColumnResizer
                        columnIndex={i + (groupBy === "area" ? 1 : 0)}
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
                colSpan={columnKeys.length}
                style={{
                  height: "var(--header-body-gap)",
                  padding: 0,
                  background: "transparent",
                }}
              />
            </tr>
            <NewTalentRow colSpan={columnKeys.length} />
            <tr aria-hidden="true">
              <td
                colSpan={columnKeys.length}
                style={{
                  height: "var(--header-body-gap)",
                  padding: 0,
                  background: "transparent",
                }}
              />
            </tr>
            {groupBy === "category"
              ? sorted.map((row) => (
                  <RowContextMenu
                    key={row.display_id}
                    onDelete={() => deleteTalent(row.record_id)}
                    itemLabel={row.name ? `"${row.name}"` : "this talent"}
                  >
                    {renderRowBody(row)}
                  </RowContextMenu>
                ))
              : sorted.map((row, i) => {
                  const isAreaEnd = areaEndSet.has(i);
                  return (
                    <Fragment key={row.display_id}>
                      <RowContextMenu
                        onDelete={() => deleteTalent(row.record_id)}
                        itemLabel={row.name ? `"${row.name}"` : "this talent"}
                      >
                        {areaStartSet.has(i) && (
                          <IcicleCell
                            span={areaByIndex[i]}
                            extraSpan={1}
                          />
                        )}
                        {renderRowBody(row)}
                      </RowContextMenu>
                      {isAreaEnd && (
                        <AddTalentRowArea
                          areaId={areaEndToAreaId[i]}
                          colSpan={columnKeys.length - 1}
                        />
                      )}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
        </DndContext>
      </div>
    </PageShell>
  );
}
