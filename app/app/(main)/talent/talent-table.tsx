"use client";

import { Fragment, useMemo, useTransition } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import {
  Pill,
  PillSelect,
  MultiPillSelect,
  type PillOption,
} from "@/components/pill";
import { EditableText } from "@/components/editable-text";
import { useTableViews } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import {
  updateTalentCategory,
  updateTalentOverallRating,
  updateTalentName,
  createTalent,
  createTalentInArea,
  addTalentArea,
  removeTalentArea,
} from "./actions";
import "./talent.css";

// Columns that exist in both grouping modes. The mode-specific keys are
// prepended below — category mode gets the three-level icicles, area mode
// gets the single area icicle.
const TALENT_COMMON_COLUMN_KEYS = [
  "resource",
  "website",
  "instagram",
  "areas",
  "category_edit",
  "overall_rating_edit",
  "notes",
] as const;

const TALENT_CATEGORY_MODE_KEYS = [
  "category",
  "overall_rating",
  ...TALENT_COMMON_COLUMN_KEYS,
] as const;

const TALENT_AREA_MODE_KEYS = [
  "area",
  ...TALENT_COMMON_COLUMN_KEYS,
] as const;

const TALENT_DEFAULT_WIDTHS: Record<string, number> = {
  category: 120,
  overall_rating: 175,
  area: 140,
  category_edit: 140,
  overall_rating_edit: 180,
  resource: 220,
  website: 180,
  instagram: 100,
  areas: 220,
  notes: 180,
};

interface TalentRow {
  id: string;
  record_id: string;
  display_id: string;
  name: string;
  primary_talent_category: string | null;
  overall_rating: string | null;
  category_color: string | null;
  rating_color: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  areas: string | null;
  areas_all: Array<{ id: string; name: string }>;
  area_id: string | null;
  area_name: string | null;
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
    { key: "category", label: "Category tree", href: "/talent" },
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

function AddTalentRowCategory({
  category,
  rating,
  colSpan,
}: {
  category: string | null;
  rating: string | null;
  colSpan: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) {
            startTransition(() => createTalent(category, rating));
          }
        }}
        title="Add talent in this group"
      >
        {pending ? "Adding…" : "+ Add talent"}
      </td>
    </tr>
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
}: {
  data: TalentRow[];
  recordCount: number;
  groupBy: "category" | "area";
  categoryOptions: PillOption[];
  ratingOptions: PillOption[];
  areaOptions: PillOption[];
}) {
  const sorted = data;
  const columnKeys =
    groupBy === "area" ? TALENT_AREA_MODE_KEYS : TALENT_CATEGORY_MODE_KEYS;

  const categoryAccessor = (r: TalentRow) =>
    r.primary_talent_category || "(none)";

  const categorySpans = useMemo(
    () =>
      computeGroupSpans(sorted, categoryAccessor, (r) => r.category_color),
    [sorted],
  );
  const ratingSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        (r) => r.overall_rating || "(none)",
        (r) => r.rating_color,
        [categoryAccessor],
      ),
    [sorted],
  );

  const categoryStartSet = new Set(categorySpans.map((s) => s.startIndex));
  const ratingStartSet = new Set(ratingSpans.map((s) => s.startIndex));

  const categoryByIndex = Object.fromEntries(
    categorySpans.map((s) => [s.startIndex, s]),
  );
  const ratingByIndex = Object.fromEntries(
    ratingSpans.map((s) => [s.startIndex, s]),
  );

  const ratingEndIndex = (start: number, span: number) => start + span - 1;
  const ratingEndToSpan = Object.fromEntries(
    ratingSpans.map((s) => [ratingEndIndex(s.startIndex, s.rowSpan), s]),
  );
  const ratingEndSet = new Set(
    ratingSpans.map((s) => ratingEndIndex(s.startIndex, s.rowSpan)),
  );

  function ratingBumpsInsideSpan(start: number, length: number): number {
    let n = 0;
    for (const span of ratingSpans) {
      if (span.startIndex >= start && span.startIndex < start + length) n++;
    }
    return n;
  }

  // Area mode spans — pre-expanded rows already carry area_name, so a single
  // pass over computeGroupSpans produces one span per tag group. Records with
  // no tags get an "(Uncategorized)" span.
  const areaSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        (r) => r.area_name || "(Uncategorized)",
        () => null,
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
  } = useTableViews("talent", TALENT_DEFAULT_WIDTHS);

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const commonHeaders = [
    { key: "resource", label: "Resource" },
    { key: "website", label: "Website" },
    { key: "instagram", label: "Instagram" },
    { key: "areas", label: "Areas" },
    { key: "category_edit", label: "Category (edit)" },
    { key: "overall_rating_edit", label: "Rating (edit)" },
    { key: "notes", label: "Notes" },
  ];
  const headers =
    groupBy === "area"
      ? [{ key: "area", label: "Area" }, ...commonHeaders]
      : [
          { key: "category", label: "Category" },
          { key: "overall_rating", label: "Overall Rating" },
          ...commonHeaders,
        ];

  const totalWidth = columnKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );

  // Render the cells that are identical across both grouping modes. Returns
  // plain JSX (not a nested component) so React doesn't rebuild the tree on
  // every render.
  const renderRowBody = (row: TalentRow) => (
    <>
      <td className={`${cellClass} text-foreground`}>
        <EditableText
          value={row.name}
          onSave={(v) => updateTalentName(row.record_id, v)}
        />
      </td>
      <td className={cellClass}>
        <WebLink url={row.website} className="max-w-[180px]" />
      </td>
      <td className={cellClass}>
        <WebLink url={row.instagram} className="max-w-[180px]" />
      </td>
      <td className={cellClass}>
        <MultiPillSelect
          value={row.areas_all.map((a) => a.id)}
          options={areaOptions}
          onAdd={(id) => addTalentArea(row.record_id, id)}
          onRemove={(id) => removeTalentArea(row.record_id, id)}
        />
      </td>
      <td className={cellClass}>
        <PillSelect
          value={row.primary_talent_category ?? ""}
          options={categoryOptions}
          onSave={(v) => updateTalentCategory(row.record_id, v)}
        />
      </td>
      <td className={cellClass}>
        <PillSelect
          value={row.overall_rating ?? ""}
          options={ratingOptions}
          onSave={(v) => updateTalentOverallRating(row.record_id, v)}
        />
      </td>
      <td className={cellClass}>
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
    </>
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
            {columnKeys.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={h.key} className={headerClass}>
                  {h.label}
                  <ColumnResizer
                    columnIndex={i}
                    currentWidth={params.columnWidths[h.key]}
                    onResize={(w) => setColumnWidth(h.key, w)}
                  />
                </th>
              ))}
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
              ? sorted.map((row, i) => {
                  const isRatingEnd = ratingEndSet.has(i);
                  const ratingSpan = isRatingEnd ? ratingEndToSpan[i] : null;
                  return (
                    <Fragment key={row.display_id}>
                      <tr>
                        {categoryStartSet.has(i) &&
                          (() => {
                            const span = categoryByIndex[i];
                            const extra = ratingBumpsInsideSpan(
                              span.startIndex,
                              span.rowSpan,
                            );
                            return <IcicleCell span={span} extraSpan={extra} />;
                          })()}
                        {ratingStartSet.has(i) && (
                          <IcicleCell span={ratingByIndex[i]} extraSpan={1} />
                        )}
                        {renderRowBody(row)}
                      </tr>
                      {isRatingEnd && ratingSpan && (
                        <AddTalentRowCategory
                          category={row.primary_talent_category}
                          rating={row.overall_rating}
                          colSpan={columnKeys.length - 2}
                        />
                      )}
                    </Fragment>
                  );
                })
              : sorted.map((row, i) => {
                  const isAreaEnd = areaEndSet.has(i);
                  return (
                    <Fragment key={row.display_id}>
                      <tr>
                        {areaStartSet.has(i) && (
                          <IcicleCell
                            span={areaByIndex[i]}
                            extraSpan={1}
                          />
                        )}
                        {renderRowBody(row)}
                      </tr>
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
      </div>
    </PageShell>
  );
}
