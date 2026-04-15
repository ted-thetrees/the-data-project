"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PillSelect, type PillOption } from "@/components/pill";
import { EditableText } from "@/components/editable-text";
import { useTableViews, resolveColumnOrder } from "@/components/table-views";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import {
  updatePersonName,
  updatePersonKnownAs,
  updatePersonPassphrase,
  updatePersonGender,
  updatePersonFamiliarity,
  updatePersonTellerStatus,
  updatePersonOrgFilled,
  updatePersonMetroArea,
  createPerson,
  createPersonMetroArea,
} from "./actions";

export interface PersonRow {
  id: string;
  name: string | null;
  known_as: string | null;
  passphrase: string | null;
  gender_id: string | null;
  familiarity_id: string | null;
  teller_status_id: string | null;
  has_org_filled_id: string | null;
  metro_area_id: string | null;
}

const COLUMN_KEYS = [
  "name",
  "known_as",
  "gender",
  "familiarity",
  "metro_area",
  "teller_status",
  "has_org_filled",
  "passphrase",
] as const;

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 200,
  known_as: 140,
  gender: 110,
  familiarity: 220,
  metro_area: 180,
  teller_status: 220,
  has_org_filled: 130,
  passphrase: 180,
};

const HEADER_LABELS: Record<string, string> = {
  name: "Name",
  known_as: "Known As",
  gender: "Gender",
  familiarity: "Familiarity",
  metro_area: "Metro Area",
  teller_status: "Teller Status",
  has_org_filled: "Org Filled",
  passphrase: "Passphrase",
};

function MetroAreaCreateForm({
  personId,
  defaultColor,
  close,
}: {
  personId: string;
  defaultColor: string;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [pending, startTransition] = useTransition();
  const canSubmit =
    name.trim().length > 0 && fullName.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      await createPersonMetroArea(personId, name, fullName, color);
      close();
    });
  };

  return (
    <div className="flex flex-col gap-2 w-[220px]">
      <div className="text-[11px] text-muted-foreground">New metro area</div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoFocus
        className="border border-border rounded-sm px-2 py-1 text-xs"
      />
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full name"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="border border-border rounded-sm px-2 py-1 text-xs"
      />
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-5 h-5 rounded-sm border border-border shrink-0"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#rrggbb"
          className="flex-1 border border-border rounded-sm px-2 py-1 font-mono text-[11px]"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="text-xs px-2 py-1 rounded-sm bg-foreground text-background disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create"}
      </button>
    </div>
  );
}

function NewPersonRow({ colSpan }: { colSpan: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="themed-new-row-cell"
        onClick={() => {
          if (!pending) startTransition(() => createPerson());
        }}
        title="Create a new person"
      >
        {pending ? "Creating…" : "+ New person"}
      </td>
    </tr>
  );
}

export function PeopleTable({
  rows,
  genderOptions,
  familiarityOptions,
  tellerStatusOptions,
  orgFilledOptions,
  metroAreaOptions,
}: {
  rows: PersonRow[];
  genderOptions: PillOption[];
  familiarityOptions: PillOption[];
  tellerStatusOptions: PillOption[];
  orgFilledOptions: PillOption[];
  metroAreaOptions: PillOption[];
}) {
  const {
    views,
    activeViewId,
    params,
    switchView,
    createView,
    renameView,
    deleteView,
    setColumnWidth,
    setColumnOrder,
  } = useTableViews("people", DEFAULT_WIDTHS);

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        COLUMN_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

  const defaultMetroAreaColor = metroAreaOptions[0]?.color ?? "#727272";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedKeys.indexOf(String(active.id));
    const newIndex = orderedKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(orderedKeys, oldIndex, newIndex));
  };

  const totalWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );

  const headerClass =
    "relative text-left text-[length:var(--header-font-size)] text-[color:var(--header-color)] px-[var(--header-padding-x)] py-[var(--header-padding-y)] bg-[color:var(--header-bg)]";
  const cellClass =
    "px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] bg-[color:var(--cell-bg)]";

  const cellRenderers: Record<string, (row: PersonRow) => React.ReactNode> = {
    name: (row) => (
      <td key="name" className={`${cellClass} text-foreground`}>
        <EditableText
          value={row.name ?? ""}
          onSave={(v) => updatePersonName(row.id, v)}
        />
      </td>
    ),
    known_as: (row) => (
      <td key="known_as" className={cellClass}>
        <EditableText
          value={row.known_as ?? ""}
          onSave={(v) => updatePersonKnownAs(row.id, v)}
        />
      </td>
    ),
    gender: (row) => (
      <td key="gender" className={cellClass}>
        <PillSelect
          value={row.gender_id ?? ""}
          options={genderOptions}
          onSave={(v) => updatePersonGender(row.id, v)}
        />
      </td>
    ),
    familiarity: (row) => (
      <td key="familiarity" className={cellClass}>
        <PillSelect
          value={row.familiarity_id ?? ""}
          options={familiarityOptions}
          onSave={(v) => updatePersonFamiliarity(row.id, v)}
        />
      </td>
    ),
    metro_area: (row) => (
      <td key="metro_area" className={cellClass}>
        <PillSelect
          value={row.metro_area_id ?? ""}
          options={metroAreaOptions}
          onSave={(v) => updatePersonMetroArea(row.id, v)}
          createSlot={(close) => (
            <MetroAreaCreateForm
              personId={row.id}
              defaultColor={defaultMetroAreaColor}
              close={close}
            />
          )}
        />
      </td>
    ),
    teller_status: (row) => (
      <td key="teller_status" className={cellClass}>
        <PillSelect
          value={row.teller_status_id ?? ""}
          options={tellerStatusOptions}
          onSave={(v) => updatePersonTellerStatus(row.id, v)}
        />
      </td>
    ),
    has_org_filled: (row) => (
      <td key="has_org_filled" className={cellClass}>
        <PillSelect
          value={row.has_org_filled_id ?? ""}
          options={orgFilledOptions}
          onSave={(v) => updatePersonOrgFilled(row.id, v)}
        />
      </td>
    ),
    passphrase: (row) => (
      <td key="passphrase" className={cellClass}>
        <EditableText
          value={row.passphrase ?? ""}
          onSave={(v) => updatePersonPassphrase(row.id, v)}
        />
      </td>
    ),
  };

  return (
    <>
      <ViewSwitcher
        views={views}
        activeViewId={activeViewId}
        onSwitch={switchView}
        onCreate={createView}
        onRename={renameView}
        onDelete={deleteView}
      />
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table
            className="text-[length:var(--cell-font-size)] [&_td]:align-top"
            style={{
              tableLayout: "fixed",
              borderCollapse: "separate",
              borderSpacing: "var(--row-gap)",
              width: totalWidth,
            }}
          >
            <colgroup>
              {orderedKeys.map((key) => (
                <col key={key} style={{ width: params.columnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <SortableContext
                  items={orderedKeys}
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedKeys.map((key, i) => (
                    <SortableHeaderCell
                      key={key}
                      id={key}
                      className={headerClass}
                      extras={
                        <ColumnResizer
                          columnIndex={i}
                          currentWidth={params.columnWidths[key]}
                          onResize={(w) => setColumnWidth(key, w)}
                        />
                      }
                    >
                      {HEADER_LABELS[key]}
                    </SortableHeaderCell>
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              <tr aria-hidden="true">
                <td
                  colSpan={orderedKeys.length}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              <NewPersonRow colSpan={orderedKeys.length} />
              <tr aria-hidden="true">
                <td
                  colSpan={orderedKeys.length}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              {rows.map((row) => (
                <tr key={row.id}>
                  {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                </tr>
              ))}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
