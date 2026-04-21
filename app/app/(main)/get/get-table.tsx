"use client";

import { DataTable, type Column } from "@/components/data-table";
import { PillSelect, type PillOption } from "@/components/pill";
import type { ViewParams } from "@/components/table-views";
import { EditableText, EditableTextWrap } from "@/components/editable-text";
import { EditableLink } from "@/components/editable-link";
import { createPicklistOptionNamed } from "../pick-lists/actions";
import { GET_STORAGE_KEY } from "./config";
import {
  createGetItem,
  deleteGetItem,
  updateGetName,
  updateGetCategory,
  updateGetStatus,
  updateGetSource,
  updateGetSourceDetail,
  updateGetUrl,
  updateGetNotes,
} from "./actions";

export interface GetRow {
  id: string;
  name: string;
  category_id: string | null;
  status_id: string | null;
  source_id: string | null;
  source_detail: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
}

const createCategory = (name: string) =>
  createPicklistOptionNamed("get_categories", name);
const createStatus = (name: string) =>
  createPicklistOptionNamed("get_statuses", name);
const createSource = (name: string) =>
  createPicklistOptionNamed("get_sources", name);

export function GetTable({
  rows,
  categoryOptions,
  statusOptions,
  sourceOptions,
  initialParams,
}: {
  rows: GetRow[];
  categoryOptions: PillOption[];
  statusOptions: PillOption[];
  sourceOptions: PillOption[];
  initialParams?: ViewParams;
}) {
  const columns: Column<GetRow>[] = [
    {
      key: "name",
      header: "Name",
      width: 320,
      render: (row) => (
        <EditableTextWrap
          value={row.name}
          onSave={(v) => updateGetName(row.id, v)}
        />
      ),
    },
    {
      key: "category",
      header: "Category",
      width: 160,
      render: (row) => (
        <PillSelect
          value={row.category_id ?? ""}
          options={categoryOptions}
          onSave={(v) => updateGetCategory(row.id, v)}
          onCreate={createCategory}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 160,
      render: (row) => (
        <PillSelect
          value={row.status_id ?? ""}
          options={statusOptions}
          onSave={(v) => updateGetStatus(row.id, v)}
          onCreate={createStatus}
        />
      ),
    },
    {
      key: "source",
      header: "Source",
      width: 160,
      render: (row) => (
        <PillSelect
          value={row.source_id ?? ""}
          options={sourceOptions}
          onSave={(v) => updateGetSource(row.id, v)}
          onCreate={createSource}
        />
      ),
    },
    {
      key: "source_detail",
      header: "Source Detail",
      width: 260,
      render: (row) => (
        <EditableText
          value={row.source_detail ?? ""}
          onSave={(v) => updateGetSourceDetail(row.id, v)}
        />
      ),
    },
    {
      key: "url",
      header: "Link",
      width: 240,
      render: (row) => (
        <EditableLink
          value={row.url}
          onSave={(v) => updateGetUrl(row.id, v)}
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
          onSave={(v) => updateGetNotes(row.id, v)}
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
      storageKey={GET_STORAGE_KEY}
      initialParams={initialParams}
      onAddTopRow={createGetItem}
      addTopRowLabel="+ New thing to get"
      onDeleteRow={(row) => deleteGetItem(row.id)}
      deleteItemLabel={(row) => `"${row.name}"`}
    />
  );
}
