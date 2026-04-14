"use client";

import { DataTable, type Column } from "@/components/data-table";
import { EditableText } from "@/components/editable-text";
import {
  EditableColorCell,
  type PaletteForPicker,
} from "@/components/editable-color-cell";
import { createPicklistOption, updatePicklistName } from "./actions";

export type Status = {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
};

export type PicklistColor = {
  id: string;
  table: string;
  field: string;
  option: string;
  color: string;
};

function buildStatusColumns(
  source: string,
  palettes: PaletteForPicker[],
  showVisible: boolean,
): Column<Status>[] {
  const base: Column<Status>[] = [
    {
      key: "name",
      header: "Option",
      render: (row) => (
        <EditableText
          value={row.name}
          onSave={(v) => updatePicklistName(source, row.id, v)}
        />
      ),
    },
    {
      key: "color",
      header: "Color",
      render: (row) => (
        <EditableColorCell
          source={source}
          recordId={row.id}
          color={row.color}
          palettes={palettes}
        />
      ),
    },
    {
      key: "hex",
      header: "Hex",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
      ),
    },
  ];
  if (showVisible) {
    base.push({
      key: "visible",
      header: "Visible",
      render: (row) => (
        <span className="text-muted-foreground">{row.visible ? "Yes" : "No"}</span>
      ),
    });
  }
  return base;
}

export function PicklistStatusTable({
  source,
  rows,
  palettes,
  showVisible = false,
  storageKey,
}: {
  source: string;
  rows: Status[];
  palettes: PaletteForPicker[];
  showVisible?: boolean;
  storageKey: string;
}) {
  const columns = buildStatusColumns(source, palettes, showVisible);
  const create = () => createPicklistOption(source);
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      storageKey={storageKey}
      onAddTopRow={create}
      addTopRowLabel="+ New option"
      onAddRow={create}
      addRowLabel="+ Add option"
    />
  );
}

function buildPicklistColorColumns(
  palettes: PaletteForPicker[],
): Column<PicklistColor>[] {
  return [
    { key: "option", header: "Option" },
    {
      key: "color",
      header: "Color",
      render: (row) => (
        <EditableColorCell
          source="picklist_colors"
          recordId={row.id}
          color={row.color}
          palettes={palettes}
        />
      ),
    },
    {
      key: "hex",
      header: "Hex",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
      ),
    },
  ];
}

export function PicklistColorTable({
  rows,
  palettes,
  storageKey,
}: {
  rows: PicklistColor[];
  palettes: PaletteForPicker[];
  storageKey: string;
}) {
  const columns = buildPicklistColorColumns(palettes);
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      storageKey={storageKey}
    />
  );
}
