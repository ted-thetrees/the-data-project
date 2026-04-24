"use client";

import { useMemo } from "react";
import { AppWindow, ExternalLink } from "lucide-react";
import { PillSelect, type PillOption } from "@/components/pill";
import { EditableText } from "@/components/editable-text";
import { RowContextMenu } from "@/components/row-context-menu";
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
const FEATURE_COL_WIDTH = 140;
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
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x-narrow)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";
  const compactCellClass =
    "px-1 py-1 bg-[color:var(--cell-bg)] text-center";

  const totalColSpan = 3 + features.length;

  // Each sticky column's "left" must include the cumulative border-spacing
  // (2px from theme --row-gap) — otherwise the gaps between Page/Go/Display
  // collapse during horizontal scroll and the column dividers disappear.
  const GAP = 2;
  const stickyOffsets = [
    GAP,
    GAP + FIXED_COL_PAGE + GAP,
    GAP + FIXED_COL_PAGE + GAP + FIXED_COL_GO + GAP,
  ];
  // Paint the column divider explicitly on each sticky cell's right edge so
  // it stays visible no matter what scrolls underneath. Use --border (gray)
  // so the line is clearly visible against the white cell backgrounds.
  const innerShadow = "1px 0 0 0 var(--border)";
  const outerShadow = "1px 0 0 0 var(--border)";
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
                style={{ textAlign: "center" }}
                title={f.label}
              >
                <div
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                    lineHeight: 1.1,
                    padding: "4px 0",
                  }}
                >
                  {f.label}
                  {f.default_for_new ? " ★" : ""}
                </div>
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

          {/* Description row — what each feature actually means */}
          <tr>
            <td
              className={cellClass}
              colSpan={3}
              style={{
                ...stickySpanRowStyle,
                fontStyle: "italic",
                color: "var(--muted-foreground)",
                verticalAlign: "top",
              }}
            >
              Description
            </td>
            {features.map((f) => (
              <td
                key={`desc-${f.id}`}
                className={cellClass}
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--muted-foreground)",
                  lineHeight: 1.35,
                  verticalAlign: "top",
                  padding: "8px 6px",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
                title={f.description ?? ""}
              >
                {f.description ?? "—"}
              </td>
            ))}
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
