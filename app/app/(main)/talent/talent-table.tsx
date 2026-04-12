"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/page-shell";
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
  website: string | null;
  instagram: string | null;
  notes: string | null;
  areas: string | null;
}

// Sort order is now handled by the server query via pick list tables

// Dark background fills for the icicle bands
const CATEGORY_BG: Record<string, string> = {
  "Places": "hsl(25, 55%, 45%)",
  "Objects & Assets": "hsl(200, 50%, 42%)",
  "Visuals": "hsl(280, 40%, 45%)",
};

const TALENT_BG: Record<string, string> = {
  "Architecture": "hsl(215, 50%, 40%)",
  "Interior Design": "hsl(35, 50%, 42%)",
  "Landscape Design": "hsl(130, 35%, 38%)",
  "Lighting Design": "hsl(55, 45%, 40%)",
  "ArchViz": "hsl(200, 45%, 40%)",
  "Web Design": "hsl(340, 40%, 42%)",
};

const RATING_BG: Record<string, string> = {
  "Absolute Top": "hsl(140, 35%, 38%)",
  "Probably Absolute Top": "hsl(170, 30%, 38%)",
  "Contenders to (Re)Mull": "hsl(270, 25%, 42%)",
  "Other": "hsl(0, 0%, 45%)",
  "Rejects": "hsl(0, 35%, 40%)",
};

// White text for all group labels
const CATEGORY_TEXT: Record<string, string> = {
  "Places": "#ffffff",
  "Objects & Assets": "#ffffff",
  "Visuals": "#ffffff",
};

const TALENT_TEXT: Record<string, string> = {
  "Architecture": "#ffffff",
  "Interior Design": "#ffffff",
  "Landscape Design": "#ffffff",
  "Lighting Design": "#ffffff",
  "ArchViz": "#ffffff",
  "Web Design": "#ffffff",
};

const RATING_TEXT: Record<string, string> = {
  "Absolute Top": "#ffffff",
  "Probably Absolute Top": "#ffffff",
  "Contenders to (Re)Mull": "#ffffff",
  "Other": "#ffffff",
  "Rejects": "#ffffff",
};

interface GroupSpan {
  value: string;
  rowSpan: number;
  startIndex: number;
}

function computeGroupSpans(
  data: TalentRow[],
  accessor: (row: TalentRow) => string,
  parentAccessors?: ((row: TalentRow) => string)[]
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    // Break when own value changes OR any parent value changes
    let parentChanged = false;
    if (parentAccessors && i > 0) {
      parentChanged = parentAccessors.some(
        (pa) => (pa(data[i]) || "(none)") !== (pa(data[i - 1]) || "(none)")
      );
    }
    if (!current || current.value !== val || parentChanged) {
      if (current) spans.push(current);
      current = { value: val, rowSpan: 1, startIndex: i };
    } else {
      current.rowSpan++;
    }
  });
  if (current) spans.push(current);
  return spans;
}

function YesBadge({ value }: { value: string | null }) {
  if (!value || value === "----" || value === "-----")
    return <span className="text-zinc-300">—</span>;
  if (value === "Yes")
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs  bg-emerald-100 text-emerald-800">
        Yes
      </span>
    );
  return <span className="text-zinc-500 text-sm">{value}</span>;
}

function WebsiteLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-zinc-300">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate block max-w-[180px]"
      title={url}
    >
      {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
    </a>
  );
}

export function TalentTable({ data }: { data: TalentRow[] }) {
  // Data arrives pre-sorted from the server via pick list sort_order
  const sorted = data;

  // Compute rowSpan groups for each icicle column
  const categorySpans = useMemo(
    () => computeGroupSpans(sorted, (r) => r.primary_talent_category || "(none)"),
    [sorted]
  );
  const categoryAccessor = (r: TalentRow) => r.primary_talent_category || "(none)";
  const talentAccessor = (r: TalentRow) => r.primary_talent || "(none)";

  const talentSpans = useMemo(
    () => computeGroupSpans(sorted, talentAccessor, [categoryAccessor]),
    [sorted]
  );
  const ratingSpans = useMemo(
    () => computeGroupSpans(sorted, (r) => r.overall_rating || "(none)", [categoryAccessor, talentAccessor]),
    [sorted]
  );

  // Build lookup: for each row index, should we render each group cell?
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

  const ROW_HEIGHT = 36; // px per row

  return (
    <PageShell title="Talent" count={sorted.length} maxWidth=""  className="talent-page">
      <div className="overflow-x-auto">
        <table className="text-[length:var(--cell-font-size)] [&_td]:align-top" style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "var(--row-gap)" }}>
          <colgroup>
            <col style={{ width: 120 }} /> {/* Category */}
            <col style={{ width: 130 }} /> {/* Primary Talent */}
            <col style={{ width: 175 }} /> {/* Overall Rating */}
            <col style={{ width: 220 }} /> {/* Resource */}
            <col style={{ width: 180 }} /> {/* Website */}
            <col style={{ width: 100 }} /> {/* Instagram */}
            <col style={{ width: 55 }} />  {/* Arch */}
            <col style={{ width: 55 }} />  {/* Int */}
            <col style={{ width: 55 }} />  {/* Land */}
            <col style={{ width: 55 }} />  {/* Light */}
            <col style={{ width: 55 }} />  {/* Kit */}
            <col style={{ width: 55 }} />  {/* AViz */}
            <col style={{ width: 140 }} /> {/* Areas */}
            <col style={{ width: 180 }} /> {/* Notes */}
          </colgroup>
          <thead>
            <tr>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Category
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Primary Talent
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Overall Rating
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Resource
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Website
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Instagram
              </th>
              <th className="text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Arch
              </th>
              <th className="text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Int
              </th>
              <th className="text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Land
              </th>
              <th className="text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Light
              </th>
              <th className="text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Kit
              </th>
              <th className="text-center text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-1 py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                AViz
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Areas
              </th>
              <th className="text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.id}>
                {/* Icicle Column 1: Category */}
                {categoryStartSet.has(i) && (() => {
                  const span = categoryByIndex[i];
                  const bg = CATEGORY_BG[span.value] || "hsl(0,0%,95%)";
                  const textColor = CATEGORY_TEXT[span.value] || "hsl(0,0%,40%)";
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-3 py-2"
                      style={{ backgroundColor: bg, minHeight: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div>
                        <span style={{ color: textColor }} className="text-sm leading-snug whitespace-nowrap">
                          {span.value}
                        </span>
                      </div>
                    </td>
                  );
                })()}

                {/* Icicle Column 2: Primary Talent */}
                {talentStartSet.has(i) && (() => {
                  const span = talentByIndex[i];
                  const bg = TALENT_BG[span.value] || "hsl(0,0%,95%)";
                  const textColor = TALENT_TEXT[span.value] || "hsl(0,0%,40%)";
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-3 py-2"
                      style={{ backgroundColor: bg, minHeight: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div>
                        <span style={{ color: textColor }} className="text-sm leading-snug whitespace-nowrap">
                          {span.value}
                        </span>
                      </div>
                    </td>
                  );
                })()}

                {/* Icicle Column 3: Overall Rating */}
                {ratingStartSet.has(i) && (() => {
                  const span = ratingByIndex[i];
                  const bg = RATING_BG[span.value] || "hsl(0,0%,95%)";
                  const textColor = RATING_TEXT[span.value] || "hsl(0,0%,40%)";
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-3 py-2"
                      style={{ backgroundColor: bg, minHeight: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div>
                        <span style={{ color: textColor }} className="text-sm leading-snug whitespace-nowrap">
                          {span.value}
                        </span>
                      </div>
                    </td>
                  );
                })()}

                {/* Data columns */}
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] text-foreground bg-[color:var(--cell-bg)]">{row.name}</td>
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"><WebsiteLink url={row.website} /></td>
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]"><WebsiteLink url={row.instagram} /></td>
                <td className="px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]"><YesBadge value={row.architecture} /></td>
                <td className="px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]"><YesBadge value={row.interiors} /></td>
                <td className="px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]"><YesBadge value={row.landscape} /></td>
                <td className="px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]"><YesBadge value={row.lighting} /></td>
                <td className="px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]"><YesBadge value={row.kitchens} /></td>
                <td className="px-1 py-[var(--cell-padding-y)] text-center bg-[color:var(--cell-bg)]"><YesBadge value={row.archviz} /></td>
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  {row.areas ? (
                    <div className="flex gap-1 flex-wrap">
                      {row.areas.split(", ").map((area) => (
                        <span
                          key={area}
                          className="inline-block px-1.5 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </td>
                <td className="px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]">
                  {row.notes ? (
                    <span className="text-zinc-500 truncate block max-w-[160px]" title={row.notes}>
                      {row.notes}
                    </span>
                  ) : (
                    <span className="text-zinc-300">—</span>
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
