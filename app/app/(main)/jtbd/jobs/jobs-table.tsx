"use client";

import { DataTable, type Column } from "@/components/data-table";
import { Pill } from "@/components/pill";
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

export function JobsTable({ rows }: { rows: JobRow[] }) {
  const columns: Column<JobRow>[] = [
    {
      key: "swatch",
      header: "",
      width: 36,
      render: (row) => <Pill color={row.color}>&nbsp;</Pill>,
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
      width: 460,
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
