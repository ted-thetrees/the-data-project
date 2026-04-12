"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
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
    <div style={{ padding: 16 }}>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "baseline",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Grid</h1>
        <span>
          <button
            onClick={() => setTableKind("tasks")}
            disabled={tableKind === "tasks"}
          >
            Tasks
          </button>{" "}
          <button
            onClick={() => setTableKind("projects")}
            disabled={tableKind === "projects"}
          >
            Projects
          </button>{" "}
          <button
            onClick={() => setTableKind("uber_projects")}
            disabled={tableKind === "uber_projects"}
          >
            Uber
          </button>
        </span>
        {loading && <span style={{ color: "#999" }}>loading…</span>}
      </div>

      {tableKind === "tasks" && (
        <PlainTable key="tasks" data={joinedTasks} columns={taskColumns} />
      )}
      {tableKind === "projects" && (
        <PlainTable key="projects" data={joinedProjects} columns={projectColumns} />
      )}
      {tableKind === "uber_projects" && (
        <PlainTable key="uber_projects" data={ubers} columns={uberColumns} />
      )}
    </div>
  );
}

function PlainTable<T extends object>({
  data,
  columns,
}: {
  data: T[];
  columns: ColumnDef<T>[];
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, color: "#666" }}>{data.length} rows</div>
    </div>
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
      header: "Name",
      cell: ({ row, getValue }) => (
        <PlainText
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
        <PlainSelect
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
        <PlainSelect
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
      cell: ({ row }) => <span>{row.original.uber_project_name ?? "—"}</span>,
    },
    {
      id: "order",
      accessorKey: "order",
      header: "Order",
      cell: ({ row, getValue }) => (
        <PlainNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateTask(row.original.id, "order", v)}
        />
      ),
    },
    {
      id: "result",
      accessorKey: "result",
      header: "Result",
      cell: ({ row, getValue }) => (
        <PlainText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateTask(row.original.id, "result", v || null)}
        />
      ),
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row, getValue }) => (
        <PlainText
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
      cell: ({ row, getValue }) => (
        <PlainText
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
        <PlainSelect
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
        <PlainSelect
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
      cell: ({ row, getValue }) => (
        <PlainText
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
      cell: ({ row, getValue }) => (
        <PlainNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateProject(row.original.id, "order", v)}
        />
      ),
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row, getValue }) => (
        <PlainText
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
      cell: ({ row, getValue }) => (
        <PlainText
          value={(getValue() as string) ?? ""}
          onCommit={(v) => updateUber(row.original.id, "name", v)}
        />
      ),
    },
    {
      id: "order",
      accessorKey: "order",
      header: "Order",
      cell: ({ row, getValue }) => (
        <PlainNumber
          value={(getValue() as number | null) ?? null}
          onCommit={(v) => updateUber(row.original.id, "order", v)}
        />
      ),
    },
  ];
}

function PlainText({
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
    <input
      type="text"
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
    />
  );
}

function PlainNumber({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [v, setV] = useState(value?.toString() ?? "");
  useEffect(() => setV(value?.toString() ?? ""), [value]);
  return (
    <input
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

function PlainSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
