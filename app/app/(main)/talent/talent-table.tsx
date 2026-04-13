"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/page-shell";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { Pill } from "@/components/pill";
import "./talent.css";

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

function IcicleCell({ span }: { span: GroupSpan }) {
  return (
    <td
      rowSpan={span.rowSpan}
      className="align-top px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"
    >
      <Pill color={span.color}>{span.value}</Pill>
    </td>
  );
}

function YesBadge({ value }: { value: string | null }) {
  if (!value || value === "----" || value === "-----") return <Empty />;
  if (value === "Yes")
    return (
      <span
        className="inline-block px-2 py-0.5 rounded"
        style={{
          fontSize: "var(--font-size-xs)",
          backgroundColor: "var(--tag-bg)",
          color: "var(--tag-text)",
        }}
      >
        Yes
      </span>
    );
  return (
    <span className="text-muted-foreground" style={{ fontSize: "var(--font-size-sm)" }}>
      {value}
    </span>
  );
}

export function TalentTable({ data }: { data: TalentRow[] }) {
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

  const headerClass =
    "text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const headerCenterClass =
    "text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";
  const cellCenterClass =
    "px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]";

  return (
    <PageShell title="Talent" count={sorted.length} maxWidth="" className="talent-page">
      <div className="overflow-x-auto">
        <table
          className="text-[length:var(--cell-font-size)] [&_td]:align-top"
          style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "var(--row-gap)" }}
        >
          <colgroup>
            <col style={{ width: 120 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 175 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 55 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 180 }} />
          </colgroup>
          <thead>
            <tr>
              <th className={headerClass}>Category</th>
              <th className={headerClass}>Primary Talent</th>
              <th className={headerClass}>Overall Rating</th>
              <th className={headerClass}>Resource</th>
              <th className={headerClass}>Website</th>
              <th className={headerClass}>Instagram</th>
              <th className={headerCenterClass}>Arch</th>
              <th className={headerCenterClass}>Int</th>
              <th className={headerCenterClass}>Land</th>
              <th className={headerCenterClass}>Light</th>
              <th className={headerCenterClass}>Kit</th>
              <th className={headerCenterClass}>AViz</th>
              <th className={headerClass}>Areas</th>
              <th className={headerClass}>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr aria-hidden="true">
              <td colSpan={14} style={{ height: 14, padding: 0, background: "transparent" }} />
            </tr>
            {sorted.map((row, i) => (
              <tr key={row.id}>
                {categoryStartSet.has(i) && (
                  <IcicleCell span={categoryByIndex[i]} />
                )}
                {talentStartSet.has(i) && (
                  <IcicleCell span={talentByIndex[i]} />
                )}
                {ratingStartSet.has(i) && (
                  <IcicleCell span={ratingByIndex[i]} />
                )}

                <td className={`${cellClass} text-foreground`}>{row.name}</td>
                <td className={cellClass}>
                  <WebLink url={row.website} className="max-w-[180px]" />
                </td>
                <td className={cellClass}>
                  <WebLink url={row.instagram} className="max-w-[180px]" />
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
                        <span
                          key={area}
                          className="inline-block px-1.5 py-0.5 rounded"
                          style={{
                            fontSize: "var(--font-size-xs)",
                            backgroundColor: "var(--tag-bg)",
                            color: "var(--tag-text)",
                          }}
                        >
                          {area}
                        </span>
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
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
