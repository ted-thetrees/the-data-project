"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type GroupingState,
  type VisibilityState,
  type ExpandedState,
  type Table as TanTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Box,
  Button,
  DropdownMenu,
  Flex,
  Heading,
  IconButton,
  Popover,
  SegmentedControl,
  Select,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type TableKind = "tasks" | "projects" | "uber_projects";

type UberProject = {
  id: string;
  name: string;
  order: number | null;
  created_at: string | null;
};

type Project = {
  id: string;
  uber_project_id: string | null;
  status_id: string | null;
  name: string;
  tickle_date: string | null;
  order: number | null;
  notes: string | null;
  passphrase: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Task = {
  id: string;
  project_id: string | null;
  status_id: string | null;
  name: string;
  order: number | null;
  result: string | null;
  notes: string | null;
  passphrase: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Status = { id: string; name: string; color: string | null };

type JoinedTask = Task & {
  status_name: string | null;
  project_name: string | null;
  uber_project_name: string | null;
  uber_project_id: string | null;
};

type JoinedProject = Project & {
  status_name: string | null;
  uber_project_name: string | null;
};

const sb = () => getSupabaseBrowser();

export default function GridClient() {
  const [ubers, setUbers] = useState<UberProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<Status[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableKind, setTableKind] = useState<TableKind>("tasks");

  useEffect(() => {
    const client = sb();
    let cancelled = false;

    async function load() {
      const [u, p, t, ps, ts] = await Promise.all([
        client.from("uber_projects").select("*"),
        client.from("projects").select("*"),
        client.from("tasks").select("*"),
        client.from("project_statuses").select("*"),
        client.from("task_statuses").select("*"),
      ]);
      if (cancelled) return;
      setUbers((u.data as UberProject[]) ?? []);
      setProjects((p.data as Project[]) ?? []);
      setTasks((t.data as Task[]) ?? []);
      setProjectStatuses((ps.data as Status[]) ?? []);
      setTaskStatuses((ts.data as Status[]) ?? []);
      setLoading(false);
    }
    load();

    const channel = client
      .channel("grid-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "uber_projects" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, []);

  const joinedTasks = useMemo<JoinedTask[]>(() => {
    const sMap = new Map(taskStatuses.map((s) => [s.id, s]));
    const pMap = new Map(projects.map((p) => [p.id, p]));
    const uMap = new Map(ubers.map((u) => [u.id, u]));
    return tasks.map((t) => {
      const p = t.project_id ? pMap.get(t.project_id) ?? null : null;
      const u = p?.uber_project_id ? uMap.get(p.uber_project_id) ?? null : null;
      const s = t.status_id ? sMap.get(t.status_id) ?? null : null;
      return {
        ...t,
        status_name: s?.name ?? null,
        project_name: p?.name ?? null,
        uber_project_name: u?.name ?? null,
        uber_project_id: p?.uber_project_id ?? null,
      };
    });
  }, [tasks, projects, ubers, taskStatuses]);

  const joinedProjects = useMemo<JoinedProject[]>(() => {
    const sMap = new Map(projectStatuses.map((s) => [s.id, s]));
    const uMap = new Map(ubers.map((u) => [u.id, u]));
    return projects.map((p) => {
      const s = p.status_id ? sMap.get(p.status_id) ?? null : null;
      const u = p.uber_project_id ? uMap.get(p.uber_project_id) ?? null : null;
      return {
        ...p,
        status_name: s?.name ?? null,
        uber_project_name: u?.name ?? null,
      };
    });
  }, [projects, projectStatuses, ubers]);

  const updateTask = useCallback(
    async (id: string, field: keyof Task, value: unknown) => {
      await sb().from("tasks").update({ [field]: value }).eq("id", id);
    },
    []
  );
  const updateProject = useCallback(
    async (id: string, field: keyof Project, value: unknown) => {
      await sb().from("projects").update({ [field]: value }).eq("id", id);
    },
    []
  );
  const updateUber = useCallback(
    async (id: string, field: keyof UberProject, value: unknown) => {
      await sb().from("uber_projects").update({ [field]: value }).eq("id", id);
    },
    []
  );

  const taskColumns = useMemo<ColumnDef<JoinedTask>[]>(
    () => buildTaskColumns({ updateTask, taskStatuses, projects: joinedProjects }),
    [updateTask, taskStatuses, joinedProjects]
  );

  const projectColumns = useMemo<ColumnDef<JoinedProject>[]>(
    () => buildProjectColumns({ updateProject, projectStatuses, ubers }),
    [updateProject, projectStatuses, ubers]
  );

  const uberColumns = useMemo<ColumnDef<UberProject>[]>(
    () => buildUberColumns({ updateUber }),
    [updateUber]
  );

  return (
    <Box p="4">
      <Flex justify="between" align="center" mb="3">
        <Heading size="5">Grid</Heading>
        <Flex gap="3" align="center">
          <SegmentedControl.Root
            value={tableKind}
            onValueChange={(v) => setTableKind(v as TableKind)}
            size="1"
          >
            <SegmentedControl.Item value="tasks">Tasks</SegmentedControl.Item>
            <SegmentedControl.Item value="projects">Projects</SegmentedControl.Item>
            <SegmentedControl.Item value="uber_projects">Uber</SegmentedControl.Item>
          </SegmentedControl.Root>
          {loading && (
            <Text size="1" color="gray">
              loading…
            </Text>
          )}
        </Flex>
      </Flex>

      {tableKind === "tasks" && (
        <GridView key="tasks" data={joinedTasks} columns={taskColumns} />
      )}
      {tableKind === "projects" && (
        <GridView key="projects" data={joinedProjects} columns={projectColumns} />
      )}
      {tableKind === "uber_projects" && (
        <GridView key="uber_projects" data={ubers} columns={uberColumns} />
      )}
    </Box>
  );
}

function GridView<T extends object>({
  data,
  columns,
}: {
  data: T[];
  columns: ColumnDef<T>[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, grouping, columnVisibility, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetExpanded: false,
  });

  const visibleLeafCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 12,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <Box>
      <Toolbar table={table} />
      <Box
        ref={scrollRef}
        style={{
          height: "calc(100vh - 200px)",
          overflow: "auto",
          border: "1px solid var(--gray-a5)",
          borderRadius: "var(--radius-2)",
        }}
      >
        <Table.Root variant="surface" size="1">
          <Table.Header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              background: "var(--gray-1)",
            }}
          >
            {table.getHeaderGroups().map((hg) => (
              <Table.Row key={hg.id}>
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sortDir = h.column.getIsSorted();
                  return (
                    <Table.ColumnHeaderCell
                      key={h.id}
                      style={{
                        cursor: canSort ? "pointer" : "default",
                        userSelect: "none",
                      }}
                      onClick={
                        canSort ? h.column.getToggleSortingHandler() : undefined
                      }
                    >
                      <Flex align="center" gap="1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sortDir === "asc" && <span>▲</span>}
                        {sortDir === "desc" && <span>▼</span>}
                      </Flex>
                    </Table.ColumnHeaderCell>
                  );
                })}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {paddingTop > 0 && (
              <Table.Row>
                <Table.Cell
                  colSpan={visibleLeafCount}
                  style={{ height: paddingTop, padding: 0, border: 0 }}
                />
              </Table.Row>
            )}
            {virtualRows.map((vr) => {
              const row = rows[vr.index];
              if (row.getIsGrouped()) {
                const groupCol = row.groupingColumnId;
                const groupVal = groupCol ? row.getValue(groupCol) : null;
                return (
                  <Table.Row
                    key={row.id}
                    style={{ background: "var(--gray-a2)" }}
                  >
                    <Table.Cell colSpan={visibleLeafCount}>
                      <Flex align="center" gap="2">
                        <IconButton
                          size="1"
                          variant="ghost"
                          onClick={row.getToggleExpandedHandler()}
                        >
                          {row.getIsExpanded() ? "▼" : "▶"}
                        </IconButton>
                        <Text weight="medium" size="2">
                          {groupVal != null && groupVal !== ""
                            ? String(groupVal)
                            : "—"}
                        </Text>
                        <Text size="1" color="gray">
                          ({row.subRows.length})
                        </Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              }
              return (
                <Table.Row key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id}>
                      {cell.getIsPlaceholder()
                        ? null
                        : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
              );
            })}
            {paddingBottom > 0 && (
              <Table.Row>
                <Table.Cell
                  colSpan={visibleLeafCount}
                  style={{ height: paddingBottom, padding: 0, border: 0 }}
                />
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
      <Box mt="2">
        <Text size="1" color="gray">
          {rows.filter((r) => !r.getIsGrouped()).length} rows
        </Text>
      </Box>
    </Box>
  );
}

function Toolbar<T>({ table }: { table: TanTable<T> }) {
  const groupedCol = table.getState().grouping[0] ?? null;
  const sorting = table.getState().sorting;
  const filters = table.getState().columnFilters;

  const groupableCols = table.getAllLeafColumns().filter((c) => c.getCanGroup());
  const filterableCols = table.getAllLeafColumns().filter((c) => c.getCanFilter());
  const sortableCols = table.getAllLeafColumns().filter((c) => c.getCanSort());
  const allCols = table.getAllLeafColumns();

  return (
    <Flex gap="2" align="center" mb="3" wrap="wrap">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="soft" size="1">
            {groupedCol ? `Group: ${labelFor(table, groupedCol)}` : "Group by"}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => table.setGrouping([])}>
            (none)
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {groupableCols.map((c) => (
            <DropdownMenu.Item
              key={c.id}
              onClick={() => table.setGrouping([c.id])}
            >
              {labelFor(table, c.id)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="soft" size="1">
            Sort{sorting.length > 0 ? ` (${sorting.length})` : ""}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {sorting.length > 0 && (
            <>
              {sorting.map((s) => (
                <DropdownMenu.Item
                  key={s.id}
                  onClick={() =>
                    table.setSorting(sorting.filter((o) => o.id !== s.id))
                  }
                >
                  ✕ {labelFor(table, s.id)} {s.desc ? "▼" : "▲"}
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator />
            </>
          )}
          {sortableCols.map((c) => {
            const existing = sorting.find((s) => s.id === c.id);
            return (
              <DropdownMenu.Item
                key={c.id}
                onClick={() => {
                  if (!existing) {
                    table.setSorting([...sorting, { id: c.id, desc: false }]);
                  } else if (!existing.desc) {
                    table.setSorting(
                      sorting.map((s) => (s.id === c.id ? { ...s, desc: true } : s))
                    );
                  } else {
                    table.setSorting(sorting.filter((s) => s.id !== c.id));
                  }
                }}
              >
                {existing
                  ? `↻ ${labelFor(table, c.id)} ${existing.desc ? "▼→off" : "▲→▼"}`
                  : `+ ${labelFor(table, c.id)}`}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Popover.Root>
        <Popover.Trigger>
          <Button variant="soft" size="1">
            Filter{filters.length > 0 ? ` (${filters.length})` : ""}
          </Button>
        </Popover.Trigger>
        <Popover.Content style={{ width: 320 }}>
          <Flex direction="column" gap="2">
            {filterableCols.map((c) => {
              const current =
                (filters.find((f) => f.id === c.id)?.value as string) ?? "";
              return (
                <Flex key={c.id} align="center" gap="2">
                  <Text size="1" style={{ width: 110 }}>
                    {labelFor(table, c.id)}
                  </Text>
                  <TextField.Root
                    size="1"
                    value={current}
                    placeholder="contains…"
                    onChange={(e) => {
                      const v = e.target.value;
                      const rest = filters.filter((o) => o.id !== c.id);
                      table.setColumnFilters(
                        v ? [...rest, { id: c.id, value: v }] : rest
                      );
                    }}
                    style={{ flex: 1 }}
                  />
                </Flex>
              );
            })}
          </Flex>
        </Popover.Content>
      </Popover.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="soft" size="1">
            Columns
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {allCols.map((c) => (
            <DropdownMenu.CheckboxItem
              key={c.id}
              checked={c.getIsVisible()}
              onCheckedChange={(v) => c.toggleVisibility(!!v)}
              onSelect={(e) => e.preventDefault()}
            >
              {labelFor(table, c.id)}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Flex>
  );
}

function labelFor<T>(table: TanTable<T>, colId: string): string {
  const c = table.getColumn(colId);
  if (!c) return colId;
  const h = c.columnDef.header;
  return typeof h === "string" ? h : colId;
}

function buildTaskColumns({
  updateTask,
  taskStatuses,
  projects,
}: {
  updateTask: (id: string, field: keyof Task, value: unknown) => Promise<void>;
  taskStatuses: Status[];
  projects: JoinedProject[];
}): ColumnDef<JoinedTask>[] {
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateTask(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "status",
      accessorKey: "status_name",
      header: "Status",
      cell: ({ row }) => (
        <StatusSelect
          value={row.original.status_id}
          options={taskStatuses}
          onChange={(v) => updateTask(row.original.id, "status_id", v)}
        />
      ),
    },
    {
      id: "project",
      accessorKey: "project_name",
      header: "Project",
      cell: ({ row }) => (
        <RelationSelect
          value={row.original.project_id}
          options={projectOptions}
          onChange={(v) => updateTask(row.original.id, "project_id", v)}
        />
      ),
    },
    {
      id: "uber_project",
      accessorKey: "uber_project_name",
      header: "Uber Project",
      cell: ({ row }) => (
        <Text size="1" color="gray">
          {row.original.uber_project_name ?? "—"}
        </Text>
      ),
    },
    {
      id: "order",
      accessorKey: "order",
      header: "Order",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateTask(row.original.id, "order", v)}
        />
      ),
    },
    {
      id: "result",
      accessorKey: "result",
      header: "Result",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateTask(row.original.id, "result", v || null)}
        />
      ),
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateTask(row.original.id, "notes", v || null)}
        />
      ),
    },
  ];
}

function buildProjectColumns({
  updateProject,
  projectStatuses,
  ubers,
}: {
  updateProject: (id: string, field: keyof Project, value: unknown) => Promise<void>;
  projectStatuses: Status[];
  ubers: UberProject[];
}): ColumnDef<JoinedProject>[] {
  const uberOptions = ubers.map((u) => ({ id: u.id, name: u.name }));
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateProject(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "status",
      accessorKey: "status_name",
      header: "Status",
      cell: ({ row }) => (
        <StatusSelect
          value={row.original.status_id}
          options={projectStatuses}
          onChange={(v) => updateProject(row.original.id, "status_id", v)}
        />
      ),
    },
    {
      id: "uber_project",
      accessorKey: "uber_project_name",
      header: "Uber Project",
      cell: ({ row }) => (
        <RelationSelect
          value={row.original.uber_project_id}
          options={uberOptions}
          onChange={(v) => updateProject(row.original.id, "uber_project_id", v)}
        />
      ),
    },
    {
      id: "tickle_date",
      accessorKey: "tickle_date",
      header: "Tickle",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          placeholder="YYYY-MM-DD"
          onCommit={(v) =>
            updateProject(row.original.id, "tickle_date", v || null)
          }
        />
      ),
    },
    {
      id: "order",
      accessorKey: "order",
      header: "Order",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateProject(row.original.id, "order", v)}
        />
      ),
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateProject(row.original.id, "notes", v || null)}
        />
      ),
    },
  ];
}

function buildUberColumns({
  updateUber,
}: {
  updateUber: (id: string, field: keyof UberProject, value: unknown) => Promise<void>;
}): ColumnDef<UberProject>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateUber(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "order",
      accessorKey: "order",
      header: "Order",
      enableGrouping: false,
      cell: ({ row, getValue }) => (
        <EditableNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateUber(row.original.id, "order", v)}
        />
      ),
    },
  ];
}

function EditableText({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <TextField.Root
      size="1"
      variant="soft"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function EditableNumber({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [v, setV] = useState(value?.toString() ?? "");
  useEffect(() => setV(value?.toString() ?? ""), [value]);
  return (
    <TextField.Root
      size="1"
      variant="soft"
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const next = v === "" ? null : Number(v);
        if (next !== value) onCommit(next);
      }}
    />
  );
}

function StatusSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: Status[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select.Root
      size="1"
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <Select.Trigger variant="soft" />
      <Select.Content>
        <Select.Item value="__none__">—</Select.Item>
        {options.map((o) => (
          <Select.Item key={o.id} value={o.id}>
            {o.name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function RelationSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select.Root
      size="1"
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <Select.Trigger variant="soft" />
      <Select.Content>
        <Select.Item value="__none__">—</Select.Item>
        {options.map((o) => (
          <Select.Item key={o.id} value={o.id}>
            {o.name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
