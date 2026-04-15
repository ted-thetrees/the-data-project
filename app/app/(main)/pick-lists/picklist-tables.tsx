"use client";

import { DataTable, type Column } from "@/components/data-table";
import { EditableText } from "@/components/editable-text";
import {
  EditableColorCell,
  type PaletteForPicker,
} from "@/components/editable-color-cell";
import {
  createPicklistOption,
  updatePicklistName,
  updatePicklistFullName,
} from "./actions";

export type Status = {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
  full_name?: string;
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
  showFullName: boolean,
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
  ];
  if (showFullName) {
    base.push({
      key: "full_name",
      header: "Full Name",
      render: (row) => (
        <EditableText
          value={row.full_name ?? ""}
          onSave={(v) => updatePicklistFullName(source, row.id, v)}
        />
      ),
    });
  }
  base.push(
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
  );
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
  showFullName = false,
  storageKey,
}: {
  source: string;
  rows: Status[];
  palettes: PaletteForPicker[];
  showVisible?: boolean;
  showFullName?: boolean;
  storageKey: string;
}) {
  const columns = buildStatusColumns(source, palettes, showVisible, showFullName);
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
