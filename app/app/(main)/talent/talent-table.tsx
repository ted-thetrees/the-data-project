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
  updateTalentPrimaryTalent,
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
  "category_edit",
  "primary_talent_edit",
  "overall_rating_edit",
  "arch",
  "int",
  "land",
  "light",
  "kit",
  "aviz",
  "areas",
  "notes",
] as const;

const TALENT_CATEGORY_MODE_KEYS = [
  "category",
  "primary_talent",
  "overall_rating",
  ...TALENT_COMMON_COLUMN_KEYS,
] as const;

const TALENT_AREA_MODE_KEYS = [
  "area",
  ...TALENT_COMMON_COLUMN_KEYS,
] as const;

const TALENT_DEFAULT_WIDTHS: Record<string, number> = {
  category: 120,
  primary_talent: 130,
  overall_rating: 175,
  area: 140,
  category_edit: 140,
  primary_talent_edit: 150,
  overall_rating_edit: 180,
  resource: 220,
  website: 180,
  instagram: 100,
  arch: 55,
  int: 55,
  land: 55,
  light: 55,
  kit: 55,
  aviz: 55,
  areas: 180,
  notes: 180,
};

interface TalentRow {
  id: string;
  record_id: string;
  display_id: string;
  name: string;
  architecture: string | null;
  interiors: string | null;
  landscape: string | null;
  lighting: string | null;
  kitchens: string | null;
  archviz: string | null;
  primary_talent: string | null;
  primary_talent_category: string | null;
  overall_rating: string | null;
  category_color: string | null;
  talent_color: string | null;
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
  primaryTalent,
  rating,
  colSpan,
}: {
  category: string | null;
  primaryTalent: string | null;
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
            startTransition(() =>
              createTalent(category, primaryTalent, rating),
            );
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
              ? createTalent(null, null, null)
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
          if (!pending) startTransition(() => createTalent(null, null, null));
        }}
        title="Create a new talent with nothing pre-filled"
      >
        {pending ? "Creating…" : "+ New talent"}
      </td>
    </tr>
  );
}

function YesBadge({ value }: { value: string | null }) {
  if (!value || value === "----" || value === "-----") return <Empty />;
  if (value === "Yes")
    return (
      <span
        className="inline-block"
        style={{
          backgroundColor: "var(--tag-bg)",
          color: "var(--tag-text)",
          fontSize: "var(--tag-font-size)",
          padding: "var(--tag-padding-y) var(--tag-padding-x)",
          borderRadius: "var(--tag-radius)",
        }}
      >
        Yes
      </span>
    );
  return (
    <span
      className="text-muted-foreground"
      style={{ fontSize: "var(--font-size-sm)" }}
    >
      {value}
    </span>
  );
}

export function TalentTable({
  data,
  recordCount,
  groupBy,
  categoryOptions,
  typeOptions,
  ratingOptions,
  areaOptions,
}: {
  data: TalentRow[];
  recordCount: number;
  groupBy: "category" | "area";
  categoryOptions: PillOption[];
  typeOptions: PillOption[];
  ratingOptions: PillOption[];
  areaOptions: PillOption[];
}) {
  const sorted = data;
  const columnKeys =
    groupBy === "area" ? TALENT_AREA_MODE_KEYS : TALENT_CATEGORY_MODE_KEYS;

  const categoryAccessor = (r: TalentRow) =>
    r.primary_talent_category || "(none)";
  const talentAccessor = (r: TalentRow) => r.primary_talent || "(none)";

  const categorySpans = useMemo(
    () =>
      computeGroupSpans(sorted, categoryAccessor, (r) => r.category_color),
    [sorted],
  );
  const talentSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        talentAccessor,
        (r) => r.talent_color,
        [categoryAccessor],
      ),
    [sorted],
  );
  const ratingSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        (r) => r.overall_rating || "(none)",
        (r) => r.rating_color,
        [categoryAccessor, talentAccessor],
      ),
    [sorted],
  );

  const categoryStartSet = new Set(categorySpans.map((s) => s.startIndex));
  const talentStartSet = new Set(talentSpans.map((s) => s.startIndex));
  const ratingStartSet = new Set(ratingSpans.map((s) => s.startIndex));

  const categoryByIndex = Object.fromEntries(
    categorySpans.map((s) => [s.startIndex, s]),
  );
  const talentByIndex = Object.fromEntries(
    talentSpans.map((s) => [s.startIndex, s]),
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
  const headerCenterClass =
    "relative text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x-narrow)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";
  const cellCenterClass =
    "px-[var(--header-padding-x-narrow)] py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]";

  const commonHeaders = [
    { key: "resource", label: "Resource", center: false },
    { key: "website", label: "Website", center: false },
    { key: "instagram", label: "Instagram", center: false },
    { key: "category_edit", label: "Category (edit)", center: false },
    { key: "primary_talent_edit", label: "Primary Talent (edit)", center: false },
    { key: "overall_rating_edit", label: "Rating (edit)", center: false },
    { key: "arch", label: "Arch", center: true },
    { key: "int", label: "Int", center: true },
    { key: "land", label: "Land", center: true },
    { key: "light", label: "Light", center: true },
    { key: "kit", label: "Kit", center: true },
    { key: "aviz", label: "AViz", center: true },
    { key: "areas", label: "Areas", center: false },
    { key: "notes", label: "Notes", center: false },
  ];
  const headers =
    groupBy === "area"
      ? [{ key: "area", label: "Area", center: false }, ...commonHeaders]
      : [
          { key: "category", label: "Category", center: false },
          { key: "primary_talent", label: "Primary Talent", center: false },
          { key: "overall_rating", label: "Overall Rating", center: false },
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
        <PillSelect
          value={row.primary_talent_category ?? ""}
          options={categoryOptions}
          onSave={(v) => updateTalentCategory(row.record_id, v)}
        />
      </td>
      <td className={cellClass}>
        <PillSelect
          value={row.primary_talent ?? ""}
          options={typeOptions}
          onSave={(v) => updateTalentPrimaryTalent(row.record_id, v)}
        />
      </td>
      <td className={cellClass}>
        <PillSelect
          value={row.overall_rating ?? ""}
          options={ratingOptions}
          onSave={(v) => updateTalentOverallRating(row.record_id, v)}
        />
      </td>
      <td className={cellCenterClass}>
        <YesBadge value={row.architecture} />
      </td>
      <td className={cellCenterClass}>
        <YesBadge value={row.interiors} />
      </td>
      <td className={cellCenterClass}>
        <YesBadge value={row.landscape} />
      </td>
      <td className={cellCenterClass}>
        <YesBadge value={row.lighting} />
      </td>
      <td className={cellCenterClass}>
        <YesBadge value={row.kitchens} />
      </td>
      <td className={cellCenterClass}>
        <YesBadge value={row.archviz} />
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
                <th
                  key={h.key}
                  className={h.center ? headerCenterClass : headerClass}
                >
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
                        {talentStartSet.has(i) &&
                          (() => {
                            const span = talentByIndex[i];
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
                          primaryTalent={row.primary_talent}
                          rating={row.overall_rating}
                          colSpan={columnKeys.length - 3}
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
