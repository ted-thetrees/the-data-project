"use client";

import { DataTable, type Column } from "@/components/data-table";
import { MultiPillSelect, type PillOption } from "@/components/pill";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import {
  addThinkerJob,
  createJobOption,
  createThinker,
  removeThinkerJob,
  updateThinkerName,
  updateThinkerNotes,
} from "./actions";

export interface ThinkerRow {
  id: string;
  name: string;
  notes: string | null;
  job_ids: string[];
}

export function ThinkersTable({
  rows,
  jobOptions,
}: {
  rows: ThinkerRow[];
  jobOptions: PillOption[];
}) {
  const columns: Column<ThinkerRow>[] = [
    {
      key: "name",
      header: "Name",
      width: 240,
      render: (row) => (
        <EditableText
          value={row.name}
          onSave={(v) => updateThinkerName(row.id, v)}
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
          onAdd={(jobId) => addThinkerJob(row.id, jobId)}
          onRemove={(jobId) => removeThinkerJob(row.id, jobId)}
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
          onSave={(v) => updateThinkerNotes(row.id, v)}
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
      storageKey="jtbd-thinkers"
      onAddTopRow={createThinker}
      addTopRowLabel="+ New thinker"
      onAddRow={createThinker}
      addRowLabel="+ Add thinker"
    />
  );
}
