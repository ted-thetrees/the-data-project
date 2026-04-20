"use client";

import { useMemo, useTransition } from "react";
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
import {
  useTableViews,
  resolveColumnOrder,
  type ViewParams,
} from "@/components/table-views";
import { PEOPLE_STORAGE_KEY, PEOPLE_DEFAULT_WIDTHS } from "./config";
import { ColumnResizer } from "@/components/column-resizer";
import { ViewSwitcher } from "@/components/view-switcher";
import { SortableHeaderCell } from "@/components/sortable-header-cell";
import { RowContextMenu } from "@/components/row-context-menu";
import { handleGridKeyDown } from "@/components/grid-keyboard-nav";
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
  deletePerson,
} from "./actions";
import { createPicklistOptionNamed } from "../pick-lists/actions";

const createGender = (name: string) =>
  createPicklistOptionNamed("people_genders", name);
const createFamiliarity = (name: string) =>
  createPicklistOptionNamed("people_familiarity_levels", name);
const createTellerStatus = (name: string) =>
  createPicklistOptionNamed("people_teller_statuses", name);
const createOrgFilled = (name: string) =>
  createPicklistOptionNamed("people_org_fill_statuses", name);
const createMetroArea = (name: string) =>
  createPicklistOptionNamed("people_metro_areas", name);

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

const DEFAULT_WIDTHS = PEOPLE_DEFAULT_WIDTHS;

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
  initialParams,
}: {
  rows: PersonRow[];
  genderOptions: PillOption[];
  familiarityOptions: PillOption[];
  tellerStatusOptions: PillOption[];
  orgFilledOptions: PillOption[];
  metroAreaOptions: PillOption[];
  initialParams?: ViewParams;
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
  } = useTableViews(PEOPLE_STORAGE_KEY, DEFAULT_WIDTHS, initialParams);

  const orderedKeys = useMemo(
    () =>
      resolveColumnOrder(
        params.columnOrder,
        COLUMN_KEYS as readonly string[],
      ),
    [params.columnOrder],
  );

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
          onCreate={createGender}
        />
      </td>
    ),
    familiarity: (row) => (
      <td key="familiarity" className={cellClass}>
        <PillSelect
          value={row.familiarity_id ?? ""}
          options={familiarityOptions}
          onSave={(v) => updatePersonFamiliarity(row.id, v)}
          onCreate={createFamiliarity}
        />
      </td>
    ),
    metro_area: (row) => (
      <td key="metro_area" className={cellClass}>
        <PillSelect
          value={row.metro_area_id ?? ""}
          options={metroAreaOptions}
          onSave={(v) => updatePersonMetroArea(row.id, v)}
          onCreate={createMetroArea}
        />
      </td>
    ),
    teller_status: (row) => (
      <td key="teller_status" className={cellClass}>
        <PillSelect
          value={row.teller_status_id ?? ""}
          options={tellerStatusOptions}
          onSave={(v) => updatePersonTellerStatus(row.id, v)}
          onCreate={createTellerStatus}
        />
      </td>
    ),
    has_org_filled: (row) => (
      <td key="has_org_filled" className={cellClass}>
        <PillSelect
          value={row.has_org_filled_id ?? ""}
          options={orgFilledOptions}
          onSave={(v) => updatePersonOrgFilled(row.id, v)}
          onCreate={createOrgFilled}
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
            onKeyDown={handleGridKeyDown}
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
                <RowContextMenu
                  key={row.id}
                  onDelete={() => deletePerson(row.id)}
                  itemLabel={row.name ? `"${row.name}"` : "this person"}
                >
                  {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                </RowContextMenu>
              ))}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}
