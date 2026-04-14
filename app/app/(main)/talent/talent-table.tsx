"use client";

import { Fragment, useMemo, useTransition } from "react";
import { PageShell } from "@/components/page-shell";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { Tag } from "@/components/tag";
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
} from "./actions";
import "./talent.css";

const TALENT_COLUMN_KEYS = [
  "category",
  "primary_talent",
  "overall_rating",
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

const TALENT_DEFAULT_WIDTHS: Record<string, number> = {
  category: 120,
  primary_talent: 130,
  overall_rating: 175,
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
  areas: 140,
  notes: 180,
};

interface TalentRow {
  id: string;
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
  parentAccessors?: ((row: TalentRow) => string)[]
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    let parentChanged = false;
    if (parentAccessors && i > 0) {
      parentChanged = parentAccessors.some(
        (pa) => (pa(data[i]) || "(none)") !== (pa(data[i - 1]) || "(none)")
      );
    }
    if (!current || current.value !== val || parentChanged) {
      if (current) spans.push(current);
      current = { value: val, rowSpan: 1, startIndex: i, color: colorAccessor(row) };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
}

function IcicleCell({ span, extraSpan = 0 }: { span: GroupSpan; extraSpan?: number }) {
  return (
    <td
      rowSpan={span.rowSpan + extraSpan}
      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"
    >
      <Pill color={span.color}>{span.value}</Pill>
    </td>
  );
}

function AddTalentRow({
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
  if (value === "Yes") return <Tag>Yes</Tag>;
  return (
    <span className="text-muted-foreground" style={{ fontSize: "var(--font-size-sm)" }}>
      {value}
    </span>
  );
}

export function TalentTable({
  data,
  categoryOptions,
  typeOptions,
  ratingOptions,
}: {
  data: TalentRow[];
  categoryOptions: PillOption[];
  typeOptions: PillOption[];
  ratingOptions: PillOption[];
}) {
  const sorted = data;

  const categoryAccessor = (r: TalentRow) => r.primary_talent_category || "(none)";
  const talentAccessor = (r: TalentRow) => r.primary_talent || "(none)";

  const categorySpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        categoryAccessor,
        (r) => r.category_color
      ),
    [sorted]
  );
  const talentSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        talentAccessor,
        (r) => r.talent_color,
        [categoryAccessor]
      ),
    [sorted]
  );
  const ratingSpans = useMemo(
    () =>
      computeGroupSpans(
        sorted,
        (r) => r.overall_rating || "(none)",
        (r) => r.rating_color,
        [categoryAccessor, talentAccessor]
      ),
    [sorted]
  );

  const categoryStartSet = new Set(categorySpans.map((s) => s.startIndex));
  const talentStartSet = new Set(talentSpans.map((s) => s.startIndex));
  const ratingStartSet = new Set(ratingSpans.map((s) => s.startIndex));

  const categoryByIndex = Object.fromEntries(
    categorySpans.map((s) => [s.startIndex, s])
  );
  const talentByIndex = Object.fromEntries(
    talentSpans.map((s) => [s.startIndex, s])
  );
  const ratingByIndex = Object.fromEntries(
    ratingSpans.map((s) => [s.startIndex, s])
  );

  // Each rating fragment gets +1 row for the dashed add-row.
  // The category and primary_talent icicles need to grow by the number of
  // rating fragments that fall within their span (one extra row per fragment).
  const ratingEndIndex = (start: number, span: number) => start + span - 1;
  const ratingEndToSpan = Object.fromEntries(
    ratingSpans.map((s) => [ratingEndIndex(s.startIndex, s.rowSpan), s]),
  );
  const ratingEndSet = new Set(
    ratingSpans.map((s) => ratingEndIndex(s.startIndex, s.rowSpan)),
  );

  // Map: for any data row index i, how many rating fragments end at i
  // within a given category/talent span (used to bump higher-level icicle rowSpans)
  function ratingBumpsInsideSpan(start: number, length: number): number {
    let n = 0;
    for (const span of ratingSpans) {
      if (span.startIndex >= start && span.startIndex < start + length) n++;
    }
    return n;
  }

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

  return (
    <PageShell title="Talent" count={sorted.length} maxWidth="" className="talent-page">
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
            width: Object.values(params.columnWidths).reduce((a, b) => a + b, 0),
          }}
        >
          <colgroup>
            {TALENT_COLUMN_KEYS.map((key) => (
              <col key={key} style={{ width: params.columnWidths[key] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {[
                { key: "category", label: "Category", center: false },
                { key: "primary_talent", label: "Primary Talent", center: false },
                { key: "overall_rating", label: "Overall Rating", center: false },
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
              ].map((h, i) => (
                <th key={h.key} className={h.center ? headerCenterClass : headerClass}>
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
                colSpan={TALENT_COLUMN_KEYS.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            <NewTalentRow colSpan={TALENT_COLUMN_KEYS.length} />
            <tr aria-hidden="true">
              <td
                colSpan={TALENT_COLUMN_KEYS.length}
                style={{ height: "var(--header-body-gap)", padding: 0, background: "transparent" }}
              />
            </tr>
            {sorted.map((row, i) => {
              const isRatingEnd = ratingEndSet.has(i);
              const ratingSpan = isRatingEnd ? ratingEndToSpan[i] : null;
              return (
                <Fragment key={row.id}>
                  <tr>
                    {categoryStartSet.has(i) && (() => {
                      const span = categoryByIndex[i];
                      const extra = ratingBumpsInsideSpan(span.startIndex, span.rowSpan);
                      return <IcicleCell span={span} extraSpan={extra} />;
                    })()}
                    {talentStartSet.has(i) && (() => {
                      const span = talentByIndex[i];
                      const extra = ratingBumpsInsideSpan(span.startIndex, span.rowSpan);
                      return <IcicleCell span={span} extraSpan={extra} />;
                    })()}
                    {ratingStartSet.has(i) && (
                      <IcicleCell span={ratingByIndex[i]} extraSpan={1} />
                    )}

                    <td className={`${cellClass} text-foreground`}>
                      <EditableText
                        value={row.name}
                        onSave={(v) => updateTalentName(row.id, v)}
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
                        onSave={(v) => updateTalentCategory(row.id, v)}
                      />
                    </td>
                    <td className={cellClass}>
                      <PillSelect
                        value={row.primary_talent ?? ""}
                        options={typeOptions}
                        onSave={(v) => updateTalentPrimaryTalent(row.id, v)}
                      />
                    </td>
                    <td className={cellClass}>
                      <PillSelect
                        value={row.overall_rating ?? ""}
                        options={ratingOptions}
                        onSave={(v) => updateTalentOverallRating(row.id, v)}
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
                      {row.areas ? (
                        <div className="flex gap-1 flex-wrap">
                          {row.areas.split(", ").map((area) => (
                            <Tag key={area}>{area}</Tag>
                          ))}
                        </div>
                      ) : (
                        <Empty />
                      )}
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
                  </tr>
                  {isRatingEnd && ratingSpan && (
                    <AddTalentRow
                      category={row.primary_talent_category}
                      primaryTalent={row.primary_talent}
                      rating={row.overall_rating}
                      colSpan={TALENT_COLUMN_KEYS.length - 3}
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

