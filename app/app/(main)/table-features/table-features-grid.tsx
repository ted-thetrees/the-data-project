"use client";

import { useMemo } from "react";
import { AppWindow, ExternalLink } from "lucide-react";
import { PillSelect, type PillOption } from "@/components/pill";
import { EditableText } from "@/components/editable-text";
import { RowContextMenu } from "@/components/row-context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createCatalogRow,
  deleteCatalogRow,
  toggleDefaultForNew,
  updateCatalogName,
  updateCatalogPath,
  updateCoverage,
  updateDisplayType,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

export interface CatalogRow {
  id: string;
  name: string;
  path: string | null;
  notes: string | null;
  sort_order: number | null;
  display_type_id: string | null;
}

export interface FeatureRow {
  id: string;
  key: string;
  label: string;
  category: string;
  description: string | null;
  default_for_new: boolean;
  sort_order: number | null;
}

export interface CoverageRow {
  table_id: string;
  feature_id: string;
  status_id: string | null;
}

const FIXED_COL_PAGE = 240;
const FIXED_COL_GO = 80;
const FIXED_COL_DISPLAY = 160;
const FEATURE_COL_WIDTH = 120;
const PROD_BASE_URL = "https://data.ifnotfor.com";

export function TableFeaturesGrid({
  catalog,
  features,
  coverage,
  statusOptions,
  displayTypeOptions,
}: {
  catalog: CatalogRow[];
  features: FeatureRow[];
  coverage: CoverageRow[];
  statusOptions: PillOption[];
  displayTypeOptions: PillOption[];
}) {
  const coverageMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const c of coverage) m.set(`${c.table_id}:${c.feature_id}`, c.status_id);
    return m;
  }, [coverage]);

  // Group features by category; preserve order by sort_order within each.
  const byCategory = useMemo(() => {
    const map = new Map<string, FeatureRow[]>();
    for (const f of features) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries()); // preserves first-seen category order
  }, [features]);

  const totalWidth =
    FIXED_COL_PAGE +
    FIXED_COL_GO +
    FIXED_COL_DISPLAY +
    features.length * FEATURE_COL_WIDTH;

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--cell-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";
  const compactCellClass =
    "px-1 py-1 bg-[color:var(--cell-bg)] text-center";

  const totalColSpan = 3 + features.length;

  // Each sticky column's "left" is the cumulative widths + border-spacing of
  // the columns to its left. Col 0 sits flush at left=0 so the 2px left
  // border-spacing of the table doesn't leave a gap where scrolling content
  // can leak through.
  const GAP = 2;
  const stickyOffsets = [
    0,
    FIXED_COL_PAGE + GAP,
    FIXED_COL_PAGE + GAP + FIXED_COL_GO + GAP,
  ];
  // Inner dividers (between pinned cols) fully cover the 2px border-spacing gap
  // so no scrolling-cell pixels leak through. The outer divider (pinned→scroll
  // boundary) paints a wider page-bg gutter so sideways-moving content is
  // completely hidden at the seam, then a 1px border line for crispness.
  const innerShadow = "2px 0 0 0 var(--border)";
  const outerShadow =
    "10px 0 0 0 var(--background), 11px 0 0 0 var(--border)";
  const stickyCellStyle = (col: 0 | 1 | 2): React.CSSProperties => ({
    position: "sticky",
    left: stickyOffsets[col],
    zIndex: 2,
    background: "var(--cell-bg)",
    boxShadow: col === 2 ? outerShadow : innerShadow,
  });
  const stickyHeaderStyle = (col: 0 | 1 | 2): React.CSSProperties => ({
    position: "sticky",
    left: stickyOffsets[col],
    zIndex: 4,
    background: "var(--header-bg)",
    boxShadow: col === 2 ? outerShadow : innerShadow,
  });
  const stickySpanHeaderStyle: React.CSSProperties = {
    position: "sticky",
    left: stickyOffsets[0],
    zIndex: 4,
    background: "var(--header-bg)",
    boxShadow: outerShadow,
  };
  const stickySpanRowStyle: React.CSSProperties = {
    position: "sticky",
    left: stickyOffsets[0],
    zIndex: 2,
    background: "var(--cell-bg)",
    boxShadow: outerShadow,
  };

  return (
    <div className="overflow-x-auto">
      <table
        className="text-[length:var(--cell-font-size)] [&_td]:align-middle"
        style={{
          tableLayout: "fixed",
          borderCollapse: "separate",
          borderSpacing: "var(--row-gap)",
          width: totalWidth,
        }}
      >
        <colgroup>
          <col style={{ width: FIXED_COL_PAGE }} />
          <col style={{ width: FIXED_COL_GO }} />
          <col style={{ width: FIXED_COL_DISPLAY }} />
          {features.map((f) => (
            <col key={f.id} style={{ width: FEATURE_COL_WIDTH }} />
          ))}
        </colgroup>

        <thead>
          {/* Category super-header */}
          <tr>
            <th
              className={headerClass}
              colSpan={3}
              style={stickySpanHeaderStyle}
            ></th>
            {byCategory.map(([category, fs]) => (
              <th
                key={`cat-${category}`}
                className={headerClass}
                colSpan={fs.length}
                style={{ textAlign: "center" }}
              >
                {category}
              </th>
            ))}
          </tr>

          {/* Feature labels */}
          <tr>
            <th className={headerClass} style={stickyHeaderStyle(0)}>
              Page
            </th>
            <th
              className={headerClass}
              style={{ ...stickyHeaderStyle(1), textAlign: "center" }}
            >
              Go
            </th>
            <th className={headerClass} style={stickyHeaderStyle(2)}>
              Display
            </th>
            {features.map((f) => (
              <th
                key={f.id}
                className={headerClass}
                style={{
                  textAlign: "center",
                  verticalAlign: "top",
                  lineHeight: 1.25,
                  whiteSpace: "normal",
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                }}
              >
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="cursor-help" />}
                  >
                    {f.label}
                  </TooltipTrigger>
                  <TooltipContent
                    sideOffset={8}
                    className="max-w-[360px] whitespace-normal"
                  >
                    <div
                      style={{
                        fontSize: "var(--cell-font-size)",
                        lineHeight: 1.5,
                      }}
                    >
                      <div className="font-semibold mb-1">{f.label}</div>
                      {f.description ?? ""}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr aria-hidden="true">
            <td
              colSpan={totalColSpan}
              style={{
                height: "var(--header-body-gap)",
                padding: 0,
                background: "transparent",
              }}
            />
          </tr>

          {/* + Add Page — sticks to the left edge with the frozen columns */}
          <tr>
            <td
              colSpan={3}
              className="themed-new-row-cell"
              onClick={() => createCatalogRow()}
              title="Register a new page"
              style={stickySpanRowStyle}
            >
              + Add Page
            </td>
            <td
              colSpan={features.length}
              style={{ background: "var(--cell-bg)" }}
            />
          </tr>

          {/* Default-for-new row — shows which features should ship on new pages */}
          <tr>
            <td
              className={cellClass}
              style={{
                ...stickyCellStyle(0),
                fontStyle: "italic",
                color: "var(--muted-foreground)",
              }}
            >
              Default for new pages
            </td>
            <td className={cellClass} style={stickyCellStyle(1)} />
            <td className={cellClass} style={stickyCellStyle(2)} />
            {features.map((f) => (
              <td key={`def-${f.id}`} className={compactCellClass}>
                <button
                  type="button"
                  onClick={() => toggleDefaultForNew(f.id, !f.default_for_new)}
                  className="themed-button-sm"
                  style={{ padding: "2px 6px" }}
                  title="Toggle default for new tables"
                >
                  {f.default_for_new ? "★" : "☆"}
                </button>
              </td>
            ))}
          </tr>

          {catalog.map((t) => (
            <RowContextMenu
              key={t.id}
              onDelete={() => deleteCatalogRow(t.id)}
              itemLabel={t.name ? `"${t.name}"` : "this table"}
            >
              <td className={cellClass} style={stickyCellStyle(0)}>
                <EditableText
                  value={t.name}
                  onSave={(v) => updateCatalogName(t.id, v)}
                />
              </td>
              <td
                className={cellClass}
                style={{ ...stickyCellStyle(1), textAlign: "center" }}
              >
                {t.path ? (
                  <div className="inline-flex items-end gap-2">
                    <a
                      href={t.path}
                      className="themed-link inline-flex items-center no-underline hover:no-underline"
                      title={`Open ${t.path} in Data app`}
                      aria-label="Open in Data app"
                    >
                      <AppWindow
                        className="w-4 h-4"
                        style={{ transform: "translateY(1px)" }}
                      />
                    </a>
                    <a
                      href={`${PROD_BASE_URL}${t.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="themed-link inline-flex items-center no-underline hover:no-underline"
                      title={`Open ${t.path} in default browser`}
                      aria-label="Open in default browser"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <EditableText
                    value=""
                    onSave={(v) => updateCatalogPath(t.id, v)}
                    placeholder="/path"
                  />
                )}
              </td>
              <td className={cellClass} style={stickyCellStyle(2)}>
                <PillSelect
                  value={t.display_type_id ?? ""}
                  options={displayTypeOptions}
                  onSave={(v) => updateDisplayType(t.id, v)}
                  onCreate={(name) =>
                    createPicklistOptionNamed("tables_display_types", name)
                  }
                />
              </td>
              {features.map((f) => {
                const statusId = coverageMap.get(`${t.id}:${f.id}`) ?? null;
                return (
                  <td key={`cov-${t.id}-${f.id}`} className={compactCellClass}>
                    <PillSelect
                      value={statusId ?? ""}
                      options={statusOptions}
                      onSave={(v) => updateCoverage(t.id, f.id, v)}
                    />
                  </td>
                );
              })}
            </RowContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
}
