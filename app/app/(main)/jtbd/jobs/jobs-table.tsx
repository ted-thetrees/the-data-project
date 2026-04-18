"use client";

import { DataTable, type Column } from "@/components/data-table";
import { MultiPillSelect, type PillOption } from "@/components/pill";
import {
  EditableColorCell,
  type PaletteForPicker,
} from "@/components/editable-color-cell";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import {
  addJobComponent,
  addJobThinker,
  createComponentOption,
  createJob,
  createThinkerOption,
  removeJobComponent,
  removeJobThinker,
  updateJobName,
  updateJobNotes,
} from "./actions";

export interface JobRow {
  id: string;
  name: string;
  color: string | null;
  notes: string | null;
  thinker_ids: string[];
  component_ids: string[];
}

export function JobsTable({
  rows,
  thinkerOptions,
  componentOptions,
  palettes,
}: {
  rows: JobRow[];
  thinkerOptions: PillOption[];
  componentOptions: PillOption[];
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
      width: 240,
      render: (row) => (
        <EditableText
          value={row.name}
          onSave={(v) => updateJobName(row.id, v)}
        />
      ),
    },
    {
      key: "thinkers",
      header: "Thinkers",
      width: 360,
      render: (row) => (
        <MultiPillSelect
          value={row.thinker_ids}
          options={thinkerOptions}
          onAdd={(thinkerId) => addJobThinker(row.id, thinkerId)}
          onRemove={(thinkerId) => removeJobThinker(row.id, thinkerId)}
          onCreate={createThinkerOption}
        />
      ),
    },
    {
      key: "components",
      header: "Components",
      width: 360,
      render: (row) => (
        <MultiPillSelect
          value={row.component_ids}
          options={componentOptions}
          onAdd={(componentId) => addJobComponent(row.id, componentId)}
          onRemove={(componentId) => removeJobComponent(row.id, componentId)}
          onCreate={createComponentOption}
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
