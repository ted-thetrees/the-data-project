"use client";

import { useState, useTransition } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import { DataTable } from "@/components/niko-table/core/data-table";
import { DataTableHeader, DataTableBody } from "@/components/niko-table/core/data-table-structure";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableViewMenu } from "@/components/niko-table/components/data-table-view-menu";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { updatePersonField } from "./actions";
import type { PersonRow } from "./page";

// --- Inline editing cells ---

function EditableText({
  value,
  onSave,
  className,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input
        type="text"
        defaultValue={value}
        autoFocus
        className="claude-input"
        style={{ width: "100%" }}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) startTransition(() => onSave(e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`claude-editable ${isPending ? "claude-pending" : ""} ${className || ""}`}
      style={style}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {value || <span className="claude-empty">—</span>}
    </span>
  );
}

function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string | null;
  options: string[];
  onSave: (v: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={value || ""}
      className={`claude-select ${isPending ? "claude-pending" : ""}`}
      onChange={(e) => startTransition(() => onSave(e.target.value))}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ImageCell({ value }: { value: unknown }) {
  if (!value) return null;
  let token = "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed[0]?.token) token = parsed[0].token;
    } catch { /* not JSON */ }
  } else if (Array.isArray(value) && value[0]?.token) {
    token = value[0].token;
  }
  if (!token) return null;
  const url = `/api/teable-image/${token}`;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
      <img
        src={url}
        alt=""
        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, display: "block" }}
        loading="lazy"
      />
    </div>
  );
}

// --- Options for select columns ---

const familiarityOptions = [
  "1 Very Close + Family", "2 Know | Current", "3 Know | In Past",
  "4 Acquainted | Talked To", "5 Contacted | No Response",
  "5 Contacted | Would not Remember Me", "7 Never Met",
];

const genderOptions = ["Man", "Woman"];

const orgFilledOptions = ["Yes", "Maybe", "No", "Sort"];

const desirabilityOptions = ["F Yes", "Possible", "Not Sure / Ponder Later", "No"];

const tellerStatusOptions = [
  "Can Ask When Website Is Up", "When I Have a Kite", "Chit Used",
  "Done/Recorded!", "Sort", "Do not Want to Ask", "Will Resist/Never Do It",
];

// --- Column definitions ---

const columns: ColumnDef<PersonRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <EditableText
        value={row.original.name || ""}
        onSave={(v) => updatePersonField(row.original.id, "name", v)}
        style={{ fontWeight: 500 }}
      />
    ),
    size: 200,
  },
  {
    accessorKey: "image",
    header: "Photo",
    cell: ({ row }) => <ImageCell value={row.original.image} />,
    size: 50,
    enableSorting: false,
  },
  {
    accessorKey: "familiarity",
    header: "Familiarity",
    cell: ({ row }) => (
      <EditableSelect
        value={row.original.familiarity}
        options={familiarityOptions}
        onSave={(v) => updatePersonField(row.original.id, "familiarity", v)}
      />
    ),
    size: 200,
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => (
      <EditableSelect
        value={row.original.gender}
        options={genderOptions}
        onSave={(v) => updatePersonField(row.original.id, "gender", v)}
      />
    ),
    size: 80,
  },
  {
    accessorKey: "known_as",
    header: "Known As",
    cell: ({ row }) => (
      <EditableText
        value={row.original.known_as || ""}
        onSave={(v) => updatePersonField(row.original.id, "known_as", v)}
      />
    ),
    size: 140,
  },
  {
    accessorKey: "metro_area",
    header: "Metro Area",
    cell: ({ row }) => (
      <EditableText
        value={row.original.metro_area || ""}
        onSave={(v) => updatePersonField(row.original.id, "metro_area", v)}
      />
    ),
    size: 180,
  },
  {
    accessorKey: "has_org_filled",
    header: "Org Filled",
    cell: ({ row }) => (
      <EditableSelect
        value={row.original.has_org_filled}
        options={orgFilledOptions}
        onSave={(v) => updatePersonField(row.original.id, "has_org_filled", v)}
      />
    ),
    size: 110,
  },
  {
    accessorKey: "target_desirability",
    header: "Desirability",
    cell: ({ row }) => (
      <EditableSelect
        value={row.original.target_desirability}
        options={desirabilityOptions}
        onSave={(v) => updatePersonField(row.original.id, "target_desirability", v)}
      />
    ),
    size: 160,
  },
  {
    accessorKey: "teller_status",
    header: "Teller Status",
    cell: ({ row }) => (
      <EditableSelect
        value={row.original.teller_status}
        options={tellerStatusOptions}
        onSave={(v) => updatePersonField(row.original.id, "teller_status", v)}
      />
    ),
    size: 200,
  },
];

// --- Main component ---

export function PeopleTable({ data }: { data: PersonRow[] }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  return (
    <div className={`claude-theme ${mode === "dark" ? "dark" : ""}`} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ maxWidth: "100%", padding: "32px 48px" }}>
        <DataTableRoot
          data={data}
          columns={columns}
          getRowId={(row) => row.id}
          state={{ sorting }}
          onSortingChange={setSorting}
          config={{
            enableSorting: true,
            enableFilters: true,
            enablePagination: false,
          }}
        >
          {/* Toolbar */}
          <DataTableToolbarSection>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>People</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DataTableSearchFilter placeholder="Search people..." />
                <DataTableViewMenu />
                <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{data.length} records</span>
                <button
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer", fontSize: 16 }}
                  onClick={() => setMode(mode === "light" ? "dark" : "light")}
                >
                  {mode === "light" ? "🌙" : "☀️"}
                </button>
              </div>
            </div>
          </DataTableToolbarSection>

          {/* Table */}
          <DataTable>
            <DataTableHeader sticky />
            <DataTableBody />
          </DataTable>
        </DataTableRoot>
      </div>

      <style>{`
        .claude-input {
          width: 100%;
          padding: 4px 8px;
          font-size: 14px;
          font-family: inherit;
          border: 1px solid var(--ring);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
        }
        .claude-select {
          font-size: 12px;
          font-family: inherit;
          padding: 3px 6px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--background);
          color: var(--foreground);
          cursor: pointer;
          outline: none;
          width: 100%;
        }
        .claude-select:focus {
          border-color: var(--ring);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
        }
        .claude-editable {
          cursor: text;
          padding: 2px 4px;
          margin: -2px -4px;
          border-radius: 4px;
          word-break: break-word;
        }
        .claude-editable:hover {
          background: var(--muted);
        }
        .claude-empty {
          color: var(--muted-foreground);
          opacity: 0.4;
        }
        .claude-pending {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
