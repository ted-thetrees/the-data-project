"use client";

import { useMemo } from "react";
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

// Light background fills for the icicle bands (matching Coda's pastel style)
const CATEGORY_BG: Record<string, string> = {
  "Places": "hsl(25, 70%, 92%)",
  "Objects & Assets": "hsl(200, 60%, 92%)",
  "Visuals": "hsl(280, 50%, 92%)",
};

const TALENT_BG: Record<string, string> = {
  "Architecture": "hsl(215, 60%, 93%)",
  "Interiors": "hsl(35, 60%, 92%)",
  "Landscape": "hsl(130, 40%, 92%)",
  "Lighting": "hsl(55, 60%, 92%)",
  "ArchViz": "hsl(200, 50%, 92%)",
  "Kitchens": "hsl(340, 45%, 92%)",
};

const RATING_BG: Record<string, string> = {
  "Absolute Top": "hsl(140, 40%, 92%)",
  "Probably Absolute Top": "hsl(170, 35%, 92%)",
  "Contenders to (Re)Mull": "hsl(270, 30%, 93%)",
  "Other": "hsl(0, 0%, 94%)",
  "Rejects": "hsl(0, 40%, 93%)",
};

// Bold label colors for the group text
const CATEGORY_TEXT: Record<string, string> = {
  "Places": "hsl(15, 75%, 45%)",
  "Objects & Assets": "hsl(200, 65%, 40%)",
  "Visuals": "hsl(280, 55%, 45%)",
};

const TALENT_TEXT: Record<string, string> = {
  "Architecture": "hsl(215, 60%, 35%)",
  "Interiors": "hsl(35, 65%, 35%)",
  "Landscape": "hsl(130, 50%, 30%)",
  "Lighting": "hsl(55, 65%, 30%)",
  "ArchViz": "hsl(200, 55%, 35%)",
  "Kitchens": "hsl(340, 50%, 35%)",
};

const RATING_TEXT: Record<string, string> = {
  "Absolute Top": "hsl(140, 50%, 30%)",
  "Probably Absolute Top": "hsl(170, 40%, 30%)",
  "Contenders to (Re)Mull": "hsl(270, 35%, 35%)",
  "Other": "hsl(0, 0%, 45%)",
  "Rejects": "hsl(0, 40%, 40%)",
};

interface GroupSpan {
  value: string;
  rowSpan: number;
  startIndex: number;
}

function computeGroupSpans(
  data: TalentRow[],
  accessor: (row: TalentRow) => string
): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let current: GroupSpan | null = null;

  data.forEach((row, i) => {
    const val = accessor(row) || "(none)";
    if (!current || current.value !== val) {
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
  const talentSpans = useMemo(
    () => computeGroupSpans(sorted, (r) => r.primary_talent || "(none)"),
    [sorted]
  );
  const ratingSpans = useMemo(
    () => computeGroupSpans(sorted, (r) => r.overall_rating || "(none)"),
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
    <div className="talent-page min-h-screen" style={{ backgroundColor: "#f9f9f7" }}>
      <div className="py-4" style={{ paddingLeft: 70, paddingRight: 70 }}>
        <h1 className="text-2xl  text-zinc-900">Talent</h1>
      </div>

      <div className="overflow-x-auto" style={{ paddingLeft: 70, paddingRight: 70 }}>
        <table className="w-full text-sm" style={{ tableLayout: "fixed", borderSpacing: 2, borderCollapse: "separate" }}>
          <colgroup>
            <col style={{ width: 90 }} /> {/* Category */}
            <col style={{ width: 90 }} /> {/* Primary Talent */}
            <col style={{ width: 110 }} /> {/* Overall Rating */}
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
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Category
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Primary Talent
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Overall Rating
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Resource
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Website
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Instagram
              </th>
              <th className="text-center text-xs  text-zinc-400 px-1 py-2 bg-white">
                Arch
              </th>
              <th className="text-center text-xs  text-zinc-400 px-1 py-2 bg-white">
                Int
              </th>
              <th className="text-center text-xs  text-zinc-400 px-1 py-2 bg-white">
                Land
              </th>
              <th className="text-center text-xs  text-zinc-400 px-1 py-2 bg-white">
                Light
              </th>
              <th className="text-center text-xs  text-zinc-400 px-1 py-2 bg-white">
                Kit
              </th>
              <th className="text-center text-xs  text-zinc-400 px-1 py-2 bg-white">
                AViz
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
                Areas
              </th>
              <th className="text-left text-xs  text-zinc-400 px-3 py-2 bg-white">
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
                      className="align-top px-3 pt-2"
                      style={{ backgroundColor: bg, height: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div>
                        <span style={{ color: textColor }} className="text-sm leading-snug">
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
                      className="align-top px-3 pt-2"
                      style={{ backgroundColor: bg, height: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div>
                        <span style={{ color: textColor }} className="text-sm leading-snug">
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
                      className="align-top px-3 pt-2"
                      style={{ backgroundColor: bg, height: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div>
                        <span style={{ color: textColor }} className="text-sm leading-snug">
                          {span.value}
                        </span>
                      </div>
                    </td>
                  );
                })()}

                {/* Data columns */}
                <td className="px-3 py-1.5  text-zinc-900 bg-white">{row.name}</td>
                <td className="px-3 py-1.5 bg-white"><WebsiteLink url={row.website} /></td>
                <td className="px-3 py-1.5 bg-white"><WebsiteLink url={row.instagram} /></td>
                <td className="px-1 py-1.5 text-center bg-white"><YesBadge value={row.architecture} /></td>
                <td className="px-1 py-1.5 text-center bg-white"><YesBadge value={row.interiors} /></td>
                <td className="px-1 py-1.5 text-center bg-white"><YesBadge value={row.landscape} /></td>
                <td className="px-1 py-1.5 text-center bg-white"><YesBadge value={row.lighting} /></td>
                <td className="px-1 py-1.5 text-center bg-white"><YesBadge value={row.kitchens} /></td>
                <td className="px-1 py-1.5 text-center bg-white"><YesBadge value={row.archviz} /></td>
                <td className="px-3 py-1.5 bg-white">
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
                <td className="px-3 py-1.5 bg-white">
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
    </div>
  );
}
