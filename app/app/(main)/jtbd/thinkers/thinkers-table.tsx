"use client";

import { DataTable, type Column } from "@/components/data-table";
import { MultiPillSelect, type PillOption } from "@/components/pill";
import {
  EditableColorCell,
  type PaletteForPicker,
} from "@/components/editable-color-cell";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import {
  addThinkerJob,
  createJobOption,
  createThinker,
  deleteThinker,
  removeThinkerJob,
  updateThinkerName,
  updateThinkerNotes,
} from "./actions";

export interface ThinkerRow {
  id: string;
  name: string;
  color: string | null;
  notes: string | null;
  job_ids: string[];
}

export function ThinkersTable({
  rows,
  jobOptions,
  palettes,
}: {
  rows: ThinkerRow[];
  jobOptions: PillOption[];
  palettes: PaletteForPicker[];
}) {
  const columns: Column<ThinkerRow>[] = [
    {
      key: "color",
      header: "Color",
      width: 60,
      render: (row) => (
        <EditableColorCell
          source="jtbd_thinkers"
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
      onDeleteRow={(row) => deleteThinker(row.id)}
      deleteItemLabel={(row) => `"${row.name}"`}
    />
  );
}
