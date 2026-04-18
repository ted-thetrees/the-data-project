"use client";

import { DataTable, type Column } from "@/components/data-table";
import { MultiPillSelect, type PillOption } from "@/components/pill";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import {
  addComponentJob,
  createComponent,
  createJobOption,
  removeComponentJob,
  updateComponentName,
  updateComponentNotes,
} from "./actions";

export interface ComponentRow {
  id: string;
  name: string;
  notes: string | null;
  job_ids: string[];
}

export function ComponentsTable({
  rows,
  jobOptions,
}: {
  rows: ComponentRow[];
  jobOptions: PillOption[];
}) {
  const columns: Column<ComponentRow>[] = [
    {
      key: "name",
      header: "Component",
      width: 240,
      render: (row) => (
        <EditableText
          value={row.name}
          onSave={(v) => updateComponentName(row.id, v)}
        />
      ),
    },
    {
      key: "jobs",
      header: "Jobs",
      width: 520,
      render: (row) => (
        <MultiPillSelect
          value={row.job_ids}
          options={jobOptions}
          onAdd={(jobId) => addComponentJob(row.id, jobId)}
          onRemove={(jobId) => removeComponentJob(row.id, jobId)}
          onCreate={createJobOption}
        />
      ),
    },
    {
      key: "notes",
      header: "Notes",
      width: 360,
      render: (row) => (
        <EditableTextWrap
          value={row.notes ?? ""}
          onSave={(v) => updateComponentNotes(row.id, v)}
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
      storageKey="jtbd-components"
      onAddTopRow={createComponent}
      addTopRowLabel="+ New component"
      onAddRow={createComponent}
      addRowLabel="+ Add component"
    />
  );
}
