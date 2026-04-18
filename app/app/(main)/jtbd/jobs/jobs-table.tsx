"use client";

import { DataTable, type Column } from "@/components/data-table";
import {
  EditableColorCell,
  type PaletteForPicker,
} from "@/components/editable-color-cell";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import { createJob, updateJobName, updateJobNotes } from "./actions";

export interface JobRow {
  id: string;
  name: string;
  color: string | null;
  notes: string | null;
  thinker_count: number;
  component_count: number;
}

export function JobsTable({
  rows,
  palettes,
}: {
  rows: JobRow[];
  palettes: PaletteForPicker[];
}) {
  const columns: Column<JobRow>[] = [
    {
      key: "color",
      header: "Color",
      width: 60,
      render: (row) => (
        <EditableColorCell
          source="jtbd_jobs"
          recordId={row.id}
          color={row.color ?? "#727272"}
          palettes={palettes}
        />
      ),
    },
    {
      key: "hex",
      header: "Hex",
      width: 90,
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.color ?? ""}
        </span>
      ),
    },
    {
      key: "name",
      header: "Job",
      width: 260,
      render: (row) => (
        <EditableText
          value={row.name}
          onSave={(v) => updateJobName(row.id, v)}
        />
      ),
    },
    {
      key: "thinker_count",
      header: "Thinkers",
      width: 90,
      render: (row) => row.thinker_count,
    },
    {
      key: "component_count",
      header: "Components",
      width: 110,
      render: (row) => row.component_count,
    },
    {
      key: "notes",
      header: "Notes",
      width: 420,
      render: (row) => (
        <EditableTextWrap
          value={row.notes ?? ""}
          onSave={(v) => updateJobNotes(row.id, v)}
          placeholder="Notes"
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      fixedLayout
      storageKey="jtbd-jobs"
      onAddTopRow={createJob}
      addTopRowLabel="+ New job"
      onAddRow={createJob}
      addRowLabel="+ Add job"
    />
  );
}
