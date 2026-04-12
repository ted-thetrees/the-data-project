"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid";
import { DataGridTableVirtual } from "@/components/reui/data-grid/data-grid-table-virtual";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Grid</h1>
        <div className="flex items-center gap-3">
          <TablePicker value={tableKind} onChange={setTableKind} />
          {loading && (
            <span className="text-muted-foreground text-xs">loading…</span>
          )}
        </div>
      </div>

      {tableKind === "tasks" && (
        <GridView key="tasks" data={joinedTasks} columns={taskColumns} />
      )}
      {tableKind === "projects" && (
        <GridView key="projects" data={joinedProjects} columns={projectColumns} />
      )}
      {tableKind === "uber_projects" && (
        <GridView key="uber_projects" data={ubers} columns={uberColumns} />
      )}
    </div>
  );
}

function TablePicker({
  value,
  onChange,
}: {
  value: TableKind;
  onChange: (v: TableKind) => void;
}) {
  const items: { k: TableKind; label: string }[] = [
    { k: "tasks", label: "Tasks" },
    { k: "projects", label: "Projects" },
    { k: "uber_projects", label: "Uber" },
  ];
  return (
    <div className="bg-muted inline-flex rounded-md p-0.5">
      {items.map((it) => (
        <Button
          key={it.k}
          size="sm"
          variant={value === it.k ? "default" : "ghost"}
          className={cn("h-7 px-3 text-xs", value !== it.k && "text-muted-foreground")}
          onClick={() => onChange(it.k)}
        >
          {it.label}
        </Button>
      ))}
    </div>
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={table.getFilteredRowModel().rows.length}
      tableLayout={{
        headerSticky: true,
        headerBorder: true,
        headerBackground: true,
        cellBorder: false,
        rowBorder: true,
        columnsVisibility: true,
        columnsResizable: true,
        columnsPinnable: true,
        width: "fixed",
      }}
    >
      <DataGridContainer>
        <DataGridTableVirtual height={"calc(100vh - 180px)"} estimateSize={44} />
      </DataGridContainer>
      <div className="text-muted-foreground mt-2 text-xs">
        {table.getFilteredRowModel().rows.length} rows
      </div>
    </DataGrid>
  );
}

function sortedHeader<T, V>(label: string) {
  return ({ column }: { column: import("@tanstack/react-table").Column<T, V> }) => (
    <DataGridColumnHeader column={column} title={label} visibility />
  );
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
      header: sortedHeader<JoinedTask, unknown>("Name"),
      size: 260,
      cell: ({ row, getValue }) => (
        <CellText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateTask(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "status",
      accessorKey: "status_name",
      header: sortedHeader<JoinedTask, unknown>("Status"),
      size: 140,
      cell: ({ row }) => (
        <CellStatus
          value={row.original.status_id}
          options={taskStatuses}
          onChange={(v) => updateTask(row.original.id, "status_id", v)}
        />
      ),
    },
    {
      id: "project",
      accessorKey: "project_name",
      header: sortedHeader<JoinedTask, unknown>("Project"),
      size: 180,
      cell: ({ row }) => (
        <CellRelation
          value={row.original.project_id}
          options={projectOptions}
          onChange={(v) => updateTask(row.original.id, "project_id", v)}
        />
      ),
    },
    {
      id: "uber_project",
      accessorKey: "uber_project_name",
      header: sortedHeader<JoinedTask, unknown>("Uber Project"),
      size: 160,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.uber_project_name ?? "—"}
        </span>
      ),
    },
    {
      id: "order",
      accessorKey: "order",
      header: sortedHeader<JoinedTask, unknown>("Order"),
      size: 80,
      cell: ({ row, getValue }) => (
        <CellNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateTask(row.original.id, "order", v)}
        />
      ),
    },
    {
      id: "result",
      accessorKey: "result",
      header: sortedHeader<JoinedTask, unknown>("Result"),
      size: 220,
      cell: ({ row, getValue }) => (
        <CellText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateTask(row.original.id, "result", v || null)}
        />
      ),
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: sortedHeader<JoinedTask, unknown>("Notes"),
      size: 260,
      cell: ({ row, getValue }) => (
        <CellText
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
      header: sortedHeader<JoinedProject, unknown>("Name"),
      size: 260,
      cell: ({ row, getValue }) => (
        <CellText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateProject(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "status",
      accessorKey: "status_name",
      header: sortedHeader<JoinedProject, unknown>("Status"),
      size: 140,
      cell: ({ row }) => (
        <CellStatus
          value={row.original.status_id}
          options={projectStatuses}
          onChange={(v) => updateProject(row.original.id, "status_id", v)}
        />
      ),
    },
    {
      id: "uber_project",
      accessorKey: "uber_project_name",
      header: sortedHeader<JoinedProject, unknown>("Uber Project"),
      size: 180,
      cell: ({ row }) => (
        <CellRelation
          value={row.original.uber_project_id}
          options={uberOptions}
          onChange={(v) => updateProject(row.original.id, "uber_project_id", v)}
        />
      ),
    },
    {
      id: "tickle_date",
      accessorKey: "tickle_date",
      header: sortedHeader<JoinedProject, unknown>("Tickle"),
      size: 130,
      cell: ({ row, getValue }) => (
        <CellText
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
      header: sortedHeader<JoinedProject, unknown>("Order"),
      size: 80,
      cell: ({ row, getValue }) => (
        <CellNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateProject(row.original.id, "order", v)}
        />
      ),
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: sortedHeader<JoinedProject, unknown>("Notes"),
      size: 260,
      cell: ({ row, getValue }) => (
        <CellText
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
      header: sortedHeader<UberProject, unknown>("Name"),
      size: 320,
      cell: ({ row, getValue }) => (
        <CellText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateUber(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "order",
      accessorKey: "order",
      header: sortedHeader<UberProject, unknown>("Order"),
      size: 80,
      cell: ({ row, getValue }) => (
        <CellNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateUber(row.original.id, "order", v)}
        />
      ),
    },
  ];
}

function CellText({
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
    <Input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setV(value);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className="h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none focus-visible:bg-background"
    />
  );
}

function CellNumber({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [v, setV] = useState(value?.toString() ?? "");
  useEffect(() => setV(value?.toString() ?? ""), [value]);
  return (
    <Input
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const next = v === "" ? null : Number(v);
        if (next !== value) onCommit(next);
      }}
      className="h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none focus-visible:bg-background"
    />
  );
}

function CellStatus({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: Status[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger className="h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CellRelation({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger className="h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
