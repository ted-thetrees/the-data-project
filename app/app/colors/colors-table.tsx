"use client";

import { useState, useCallback, useContext } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { useDataTable } from "@/components/niko-table/core/data-table-context";
import { ColContext, ColResizer } from "@/components/data-grid/col-context";
import { EditableText } from "@/components/data-grid/editable-cells";
import { DEPTH_COLORS, GAP_PX, dataGridStyles } from "@/components/data-grid/styles";
import { updateColorField } from "./actions";
import type { ColorRow } from "./page";

const COL_WIDTHS = [200, 120, 80, 60]; // Name, Hex, Palette, Swatch

const columns: ColumnDef<ColorRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "hex", header: "Hex" },
  { accessorKey: "palette", header: "Palette" },
];

function RecordCount({ total }: { total: number }) {
  const { table } = useDataTable<ColorRow>();
  const filtered = table.getRowModel().rows.length;
  return <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{filtered === total ? `${total} colors` : `${filtered} of ${total}`}</span>;
}

function ColorBody() {
  const { table } = useDataTable<ColorRow>();
  const { widths } = useContext(ColContext);
  const rows = table.getRowModel().rows;
  const bg = DEPTH_COLORS[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP_PX }}>
      {/* Headers */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: GAP_PX,
        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
        color: "var(--muted-foreground)",
      }}>
        <div style={{ width: widths[0], flexShrink: 0, padding: "8px 12px", background: "var(--muted)", position: "relative" }}>
          Name<ColResizer index={0} />
        </div>
        <div style={{ width: widths[1], flexShrink: 0, padding: "8px 12px", background: "var(--muted)", position: "relative" }}>
          Hex<ColResizer index={1} />
        </div>
        <div style={{ width: widths[2], flexShrink: 0, padding: "8px 12px", background: "var(--muted)", position: "relative" }}>
          Palette<ColResizer index={2} />
        </div>
        <div style={{ width: widths[3], flexShrink: 0, padding: "8px 12px", background: "var(--muted)" }}>
          Swatch
        </div>
      </div>

      {/* Rows */}
      {rows.map((row) => (
        <div key={row.id} style={{ display: "flex", alignItems: "stretch", gap: GAP_PX }}>
          <div className="gt-cell" style={{ width: widths[0], flexShrink: 0, background: bg, position: "relative", fontWeight: 500 }}>
            <EditableText value={row.original.name || ""} onSave={(v) => updateColorField(row.original.id, "name", v)} />
            <ColResizer index={0} />
          </div>
          <div className="gt-cell" style={{ width: widths[1], flexShrink: 0, background: bg, position: "relative", fontFamily: "monospace", fontSize: 13 }}>
            <EditableText value={row.original.hex || ""} onSave={(v) => updateColorField(row.original.id, "hex", v)} />
            <ColResizer index={1} />
          </div>
          <div className="gt-cell" style={{ width: widths[2], flexShrink: 0, background: bg, position: "relative" }}>
            <EditableText value={row.original.palette || ""} onSave={(v) => updateColorField(row.original.id, "palette", v)} />
            <ColResizer index={2} />
          </div>
          <div className="gt-cell" style={{ width: widths[3], flexShrink: 0, background: bg, justifyContent: "center" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: row.original.hex || "transparent",
              border: "1px solid var(--border)",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColorsTable({ data }: { data: ColorRow[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [widths, setWidths] = useState(COL_WIDTHS);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const onResize = useCallback((i: number, delta: number) => {
    setWidths((prev) => { const next = [...prev]; next[i] = Math.max(60, next[i] + delta); return next; });
  }, []);

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: 600, padding: "32px 48px" }}>
        <DataTableRoot
          data={data}
          columns={columns}
          getRowId={(row) => row.id}
          state={{ sorting }}
          onSortingChange={setSorting}
          config={{ enableSorting: true, enableFilters: true, enablePagination: false }}
        >
          <DataTableToolbarSection>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Colors</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search colors..." />
                <RecordCount total={data.length} />
                <button style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}>{mode === "light" ? "🌙" : "☀️"}</button>
              </div>
            </div>
          </DataTableToolbarSection>

          <ColContext.Provider value={{ widths, onResize }}>
            <ColorBody />
          </ColContext.Provider>
        </DataTableRoot>
      </div>
      <style>{dataGridStyles}</style>
    </div>
  );
}
