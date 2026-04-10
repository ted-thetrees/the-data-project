"use client";

import { useMemo } from "react";

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

const RATING_ORDER: Record<string, number> = {
  "1 Absolute Top": 1,
  "2 Probably Absolute Top": 2,
  "3 Contenders to (Re)Mull": 3,
  "4 Other": 4,
};

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
  "1 Absolute Top": "hsl(140, 40%, 92%)",
  "2 Probably Absolute Top": "hsl(170, 35%, 92%)",
  "3 Contenders to (Re)Mull": "hsl(270, 30%, 93%)",
  "4 Other": "hsl(0, 0%, 94%)",
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
  "1 Absolute Top": "hsl(140, 50%, 30%)",
  "2 Probably Absolute Top": "hsl(170, 40%, 30%)",
  "3 Contenders to (Re)Mull": "hsl(270, 35%, 35%)",
  "4 Other": "hsl(0, 0%, 45%)",
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
      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
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
  // Sort data by group hierarchy, then by name within groups
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const catA = a.primary_talent_category || "";
      const catB = b.primary_talent_category || "";
      if (catA !== catB) return catA.localeCompare(catB);

      const talA = a.primary_talent || "";
      const talB = b.primary_talent || "";
      if (talA !== talB) return talA.localeCompare(talB);

      const ratA = RATING_ORDER[a.overall_rating || ""] ?? 99;
      const ratB = RATING_ORDER[b.overall_rating || ""] ?? 99;
      if (ratA !== ratB) return ratA - ratB;

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [data]);

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
    <div className="min-h-screen bg-white">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-zinc-900">Talent</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 160 }} /> {/* Category */}
            <col style={{ width: 160 }} /> {/* Primary Talent */}
            <col style={{ width: 200 }} /> {/* Overall Rating */}
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
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Category
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Primary Talent
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Overall Rating
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Resource
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Website
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Instagram
              </th>
              <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 py-2 border-b border-zinc-200">
                Arch
              </th>
              <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 py-2 border-b border-zinc-200">
                Int
              </th>
              <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 py-2 border-b border-zinc-200">
                Land
              </th>
              <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 py-2 border-b border-zinc-200">
                Light
              </th>
              <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 py-2 border-b border-zinc-200">
                Kit
              </th>
              <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 py-2 border-b border-zinc-200">
                AViz
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Areas
              </th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-200">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                {/* Icicle Column 1: Category */}
                {categoryStartSet.has(i) && (() => {
                  const span = categoryByIndex[i];
                  const bg = CATEGORY_BG[span.value] || "hsl(0,0%,95%)";
                  const textColor = CATEGORY_TEXT[span.value] || "hsl(0,0%,40%)";
                  return (
                    <td
                      rowSpan={span.rowSpan}
                      className="align-top px-3 pt-2 font-semibold border-r border-zinc-100"
                      style={{ backgroundColor: bg, height: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div className="flex justify-between items-start">
                        <span style={{ color: textColor }} className="text-sm">
                          ▼ {span.value}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1">{span.rowSpan}</span>
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
                      className="align-top px-3 pt-2 font-semibold border-r border-zinc-100"
                      style={{ backgroundColor: bg, height: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div className="flex justify-between items-start">
                        <span style={{ color: textColor }} className="text-sm">
                          ▼ {span.value}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1">{span.rowSpan}</span>
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
                      className="align-top px-3 pt-2 font-semibold border-r border-zinc-100"
                      style={{ backgroundColor: bg, height: span.rowSpan * ROW_HEIGHT }}
                    >
                      <div className="flex justify-between items-start">
                        <span style={{ color: textColor }} className="text-sm">
                          ▼ {span.value}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1">{span.rowSpan}</span>
                      </div>
                    </td>
                  );
                })()}

                {/* Data columns */}
                <td className="px-3 py-1.5 font-medium text-zinc-900">{row.name}</td>
                <td className="px-3 py-1.5"><WebsiteLink url={row.website} /></td>
                <td className="px-3 py-1.5"><WebsiteLink url={row.instagram} /></td>
                <td className="px-1 py-1.5 text-center"><YesBadge value={row.architecture} /></td>
                <td className="px-1 py-1.5 text-center"><YesBadge value={row.interiors} /></td>
                <td className="px-1 py-1.5 text-center"><YesBadge value={row.landscape} /></td>
                <td className="px-1 py-1.5 text-center"><YesBadge value={row.lighting} /></td>
                <td className="px-1 py-1.5 text-center"><YesBadge value={row.kitchens} /></td>
                <td className="px-1 py-1.5 text-center"><YesBadge value={row.archviz} /></td>
                <td className="px-3 py-1.5">
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
                <td className="px-3 py-1.5">
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
