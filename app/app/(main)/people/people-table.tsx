"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import { Pill, PillSelect, type PillOption } from "@/components/pill";
import { GroupByPicker } from "@/components/group-by-picker";
import {
  groupRows,
  type GroupBySpec,
  type GroupItem,
  type GroupNode,
} from "@/lib/table-grouping";
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
  createPersonInGroup,
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

const GROUPABLE_KEYS = [
  "gender",
  "familiarity",
  "metro_area",
  "teller_status",
  "has_org_filled",
] as const;

const ROW_FIELD_FOR_GROUP: Record<string, keyof PersonRow> = {
  gender: "gender_id",
  familiarity: "familiarity_id",
  metro_area: "metro_area_id",
  teller_status: "teller_status_id",
  has_org_filled: "has_org_filled_id",
};

const ICICLE_COLUMN_WIDTH = 200;

type FlatRow =
  | { kind: "data"; row: PersonRow; path: GroupNode<PersonRow>[] }
  | {
      kind: "collapsed";
      group: GroupNode<PersonRow>;
      pathIncludingSelf: GroupNode<PersonRow>[];
    }
  | {
      kind: "add";
      group: GroupNode<PersonRow>;
      path: GroupNode<PersonRow>[];
    };

function flattenPeople(
  items: GroupItem<PersonRow>[],
  collapsed: Set<string>,
  parentPath: GroupNode<PersonRow>[],
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const item of items) {
    if (item.kind === "group") {
      const pathInc = [...parentPath, item];
      if (collapsed.has(item.path)) {
        out.push({ kind: "collapsed", group: item, pathIncludingSelf: pathInc });
      } else {
        const isInnermost = item.children.every((c) => c.kind === "row");
        if (isInnermost) out.push({ kind: "add", group: item, path: pathInc });
        out.push(...flattenPeople(item.children, collapsed, pathInc));
      }
    } else {
      out.push({ kind: "data", row: item.row, path: parentPath });
    }
  }
  return out;
}

interface LevelSpan {
  startIndex: number;
  rowSpan: number;
  group: GroupNode<PersonRow>;
}

function computePeopleSpans(flat: FlatRow[], level: number): LevelSpan[] {
  const out: LevelSpan[] = [];
  let current: LevelSpan | null = null;
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    const g =
      f.kind === "collapsed"
        ? f.pathIncludingSelf[level] ?? null
        : f.path[level] ?? null;
    if (!g) {
      if (current) out.push(current);
      current = null;
      continue;
    }
    if (current && current.group.path === g.path) {
      current.rowSpan++;
    } else {
      if (current) out.push(current);
      current = { startIndex: i, rowSpan: 1, group: g };
    }
  }
  if (current) out.push(current);
  return out;
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
    setGroupBy,
  } = useTableViews(PEOPLE_STORAGE_KEY, DEFAULT_WIDTHS, initialParams);

  const groupBy = useMemo(
    () =>
      (params.groupBy ?? []).filter((k): k is (typeof GROUPABLE_KEYS)[number] =>
        (GROUPABLE_KEYS as readonly string[]).includes(k),
      ),
    [params.groupBy],
  );
  const iceLevels = groupBy.length;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [, startCreateInGroup] = useTransition();
  const toggleCollapsed = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const optionsForField: Record<string, PillOption[]> = {
    gender: genderOptions,
    familiarity: familiarityOptions,
    metro_area: metroAreaOptions,
    teller_status: tellerStatusOptions,
    has_org_filled: orgFilledOptions,
  };
  const colorLookup: Record<string, Map<string, string | null>> =
    Object.fromEntries(
      Object.entries(optionsForField).map(([field, opts]) => [
        field,
        new Map(opts.map((o) => [o.id, o.color])),
      ]),
    );

  const specs: GroupBySpec<PersonRow>[] = groupBy.map((field) => {
    const rowField = ROW_FIELD_FOR_GROUP[field];
    const opts = optionsForField[field] ?? [];
    const lookup = new Map(opts.map((o) => [o.id, o.name] as const));
    return {
      field,
      getKey: (row) => {
        const v = row[rowField];
        return typeof v === "string" && v.length > 0 ? v : null;
      },
      getLabel: (key) =>
        key === null ? "Uncategorized" : lookup.get(key) ?? "(unknown)",
      keyOrder: opts.map((o) => o.id),
    };
  });

  const tree = useMemo(
    () => groupRows(rows, specs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, groupBy.join(",")],
  );

  const iceWidth = (level: number) => {
    const field = groupBy[level];
    if (!field) return ICICLE_COLUMN_WIDTH;
    return params.columnWidths[`__ice:${field}`] ?? ICICLE_COLUMN_WIDTH;
  };

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

  const userColsWidth = orderedKeys.reduce(
    (sum, k) => sum + (params.columnWidths[k] ?? 0),
    0,
  );
  const iceColsWidth = Array.from({ length: iceLevels }).reduce<number>(
    (sum, _, i) => sum + iceWidth(i),
    0,
  );
  const totalWidth = userColsWidth + iceColsWidth;
  const totalColumnCount = iceLevels + orderedKeys.length;

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
      <GroupByPicker
        available={[...GROUPABLE_KEYS].map((k) => ({
          key: k,
          label: HEADER_LABELS[k] ?? k,
        }))}
        groupBy={groupBy}
        onChange={setGroupBy}
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
              {Array.from({ length: iceLevels }).map((_, i) => (
                <col key={`ice-${i}`} style={{ width: iceWidth(i) }} />
              ))}
              {orderedKeys.map((key) => (
                <col key={key} style={{ width: params.columnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {Array.from({ length: iceLevels }).map((_, i) => (
                  <th
                    key={`ice-h-${i}`}
                    className={headerClass}
                    style={{ position: "relative" }}
                  >
                    {HEADER_LABELS[groupBy[i]] ?? groupBy[i]}
                    <ColumnResizer
                      columnIndex={i}
                      currentWidth={iceWidth(i)}
                      onResize={(w) => setColumnWidth(`__ice:${groupBy[i]}`, w)}
                    />
                  </th>
                ))}
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
                          columnIndex={i + iceLevels}
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
                  colSpan={totalColumnCount}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              <NewPersonRow colSpan={totalColumnCount} />
              <tr aria-hidden="true">
                <td
                  colSpan={totalColumnCount}
                  style={{
                    height: "var(--header-body-gap)",
                    padding: 0,
                    background: "transparent",
                  }}
                />
              </tr>
              {iceLevels === 0
                ? rows.map((row) => (
                    <RowContextMenu
                      key={row.id}
                      onDelete={() => deletePerson(row.id)}
                      itemLabel={row.name ? `"${row.name}"` : "this person"}
                    >
                      {orderedKeys.map((key) => cellRenderers[key]?.(row))}
                    </RowContextMenu>
                  ))
                : renderPeopleGrouped(
                    tree,
                    collapsed,
                    toggleCollapsed,
                    iceLevels,
                    orderedKeys,
                    cellRenderers,
                    (row) => deletePerson(row.id),
                    colorLookup,
                    (prefill) => {
                      startCreateInGroup(() => createPersonInGroup(prefill));
                    },
                  )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </>
  );
}

function renderPeopleGrouped(
  tree: GroupItem<PersonRow>[],
  collapsed: Set<string>,
  toggle: (path: string) => void,
  iceLevels: number,
  orderedKeys: string[],
  cellRenderers: Record<string, (row: PersonRow) => React.ReactNode>,
  onDelete: (row: PersonRow) => void | Promise<void>,
  colorLookup: Record<string, Map<string, string | null>>,
  onAddInGroup: (prefill: Record<string, string | null>) => void,
): React.ReactNode[] {
  const flat = flattenPeople(tree, collapsed, []);
  const spanStartAt: Map<number, LevelSpan>[] = [];
  for (let L = 0; L < iceLevels; L++) {
    const spans = computePeopleSpans(flat, L);
    const map = new Map<number, LevelSpan>();
    for (const s of spans) map.set(s.startIndex, s);
    spanStartAt.push(map);
  }

  const out: React.ReactNode[] = [];
  for (let i = 0; i < flat.length; i++) {
    const frow = flat[i];
    const icicleCells: React.ReactNode[] = [];
    let collapsedRight = false;

    for (let L = 0; L < iceLevels; L++) {
      const span = spanStartAt[L].get(i);
      if (!span) continue;
      const isCollapsedLevel =
        frow.kind === "collapsed" && frow.group.level === L;
      const color =
        span.group.value != null
          ? colorLookup[span.group.field]?.get(span.group.value) ?? null
          : null;
      if (isCollapsedLevel) {
        icicleCells.push(
          <td
            key={`ice-${L}`}
            rowSpan={span.rowSpan}
            colSpan={iceLevels - L + orderedKeys.length}
            className="themed-group-merged-cell cursor-pointer select-none"
            onClick={() => toggle(span.group.path)}
            title="Expand"
          >
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 shrink-0" />
              <Pill color={color}>{span.group.label}</Pill>
              <span className="text-[color:var(--muted-foreground)] text-xs">
                ({span.group.count})
              </span>
            </div>
          </td>,
        );
        collapsedRight = true;
        break;
      }
      icicleCells.push(
        <td
          key={`ice-${L}`}
          rowSpan={span.rowSpan}
          className="themed-group-merged-cell cursor-pointer select-none"
          onClick={() => toggle(span.group.path)}
          title="Collapse"
        >
          <div className="flex items-start gap-1">
            <ChevronDown className="w-3 h-3 mt-1 shrink-0" />
            <Pill color={color}>{span.group.label}</Pill>
          </div>
        </td>,
      );
    }

    if (frow.kind === "collapsed") {
      if (!collapsedRight) {
        icicleCells.push(
          <td
            key="placeholder"
            colSpan={orderedKeys.length}
            className="bg-[color:var(--cell-bg)]"
          />,
        );
      }
      out.push(
        <tr key={`c-${frow.group.path}`} className="themed-group-row">
          {icicleCells}
        </tr>,
      );
      continue;
    }

    if (frow.kind === "add") {
      const prefill: Record<string, string | null> = {};
      for (const g of frow.path) {
        const col = ROW_FIELD_FOR_GROUP[g.field];
        if (col) prefill[col as string] = g.value;
      }
      out.push(
        <tr key={`add-${frow.group.path}`}>
          {icicleCells}
          <td
            colSpan={orderedKeys.length}
            className="themed-new-row-cell"
            onClick={() => onAddInGroup(prefill)}
            title="Add a person in this group"
          >
            + Add
          </td>
        </tr>,
      );
      continue;
    }

    const row = frow.row;
    out.push(
      <RowContextMenu
        key={row.id}
        onDelete={() => onDelete(row)}
        itemLabel={row.name ? `"${row.name}"` : "this person"}
      >
        {icicleCells}
        {orderedKeys.map((key) => cellRenderers[key]?.(row))}
      </RowContextMenu>,
    );
  }
  return out;
}
