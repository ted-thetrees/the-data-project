"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Box,
  Flex,
  Heading,
  Select,
  Table,
  TextField,
  Text,
  Badge,
} from "@radix-ui/themes";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type UberProject = { id: string; name: string; order: number | null };
type Project = {
  id: string;
  uber_project_id: string | null;
  status_id: string | null;
  name: string;
  tickle_date: string | null;
  order: number | null;
  notes: string | null;
};
type Task = {
  id: string;
  project_id: string | null;
  status_id: string | null;
  name: string;
  order: number | null;
  result: string | null;
  notes: string | null;
};
type Status = { id: string; name: string; color: string | null };

type Row =
  | { kind: "uber"; id: string; depth: 0; data: UberProject }
  | { kind: "project"; id: string; depth: 1; data: Project }
  | { kind: "task"; id: string; depth: 2; data: Task };

const sb = () => getSupabaseBrowser();

function byOrderThenName<T extends { order: number | null; name: string }>(a: T, b: T) {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
}

function flatten(
  ubers: UberProject[],
  projects: Project[],
  tasks: Task[]
): Row[] {
  const out: Row[] = [];
  const sortedUbers = [...ubers].sort(byOrderThenName);
  for (const u of sortedUbers) {
    out.push({ kind: "uber", id: u.id, depth: 0, data: u });
    const ps = projects
      .filter((p) => p.uber_project_id === u.id)
      .sort(byOrderThenName);
    for (const p of ps) {
      out.push({ kind: "project", id: p.id, depth: 1, data: p });
      const ts = tasks
        .filter((t) => t.project_id === p.id)
        .sort(byOrderThenName);
      for (const t of ts) {
        out.push({ kind: "task", id: t.id, depth: 2, data: t });
      }
    }
  }
  const orphanProjects = projects
    .filter((p) => !p.uber_project_id || !ubers.some((u) => u.id === p.uber_project_id))
    .sort(byOrderThenName);
  for (const p of orphanProjects) {
    out.push({ kind: "project", id: p.id, depth: 1, data: p });
    const ts = tasks.filter((t) => t.project_id === p.id).sort(byOrderThenName);
    for (const t of ts) out.push({ kind: "task", id: t.id, depth: 2, data: t });
  }
  return out;
}

export default function GridClient() {
  const [ubers, setUbers] = useState<UberProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<Status[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);

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

  const rows = useMemo(
    () => flatten(ubers, projects, tasks),
    [ubers, projects, tasks]
  );

  async function updateField(
    table: "uber_projects" | "projects" | "tasks",
    id: string,
    field: string,
    value: unknown
  ) {
    await sb().from(table).update({ [field]: value }).eq("id", id);
  }

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "kind",
        header: "Type",
        size: 90,
        cell: ({ row }) => {
          const k = row.original.kind;
          const color = k === "uber" ? "brown" : k === "project" ? "indigo" : "gray";
          return (
            <Badge color={color as never} variant="soft" size="1">
              {k}
            </Badge>
          );
        },
      },
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => {
          const r = row.original;
          const table =
            r.kind === "uber" ? "uber_projects" : r.kind === "project" ? "projects" : "tasks";
          return (
            <Box style={{ paddingLeft: r.depth * 20 }}>
              <EditableText
                value={r.data.name}
                onCommit={(v) => updateField(table, r.id, "name", v)}
              />
            </Box>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        size: 140,
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "uber") return null;
          const opts = r.kind === "project" ? projectStatuses : taskStatuses;
          const table = r.kind === "project" ? "projects" : "tasks";
          return (
            <StatusSelect
              value={r.data.status_id}
              options={opts}
              onChange={(v) => updateField(table, r.id, "status_id", v)}
            />
          );
        },
      },
      {
        id: "order",
        header: "Order",
        size: 70,
        cell: ({ row }) => {
          const r = row.original;
          const table =
            r.kind === "uber" ? "uber_projects" : r.kind === "project" ? "projects" : "tasks";
          return (
            <EditableNumber
              value={r.data.order}
              onCommit={(v) => updateField(table, r.id, "order", v)}
            />
          );
        },
      },
      {
        id: "tickle",
        header: "Tickle",
        size: 130,
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind !== "project") return null;
          return (
            <EditableText
              value={r.data.tickle_date ?? ""}
              placeholder="YYYY-MM-DD"
              onCommit={(v) => updateField("projects", r.id, "tickle_date", v || null)}
            />
          );
        },
      },
      {
        id: "result",
        header: "Result",
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind !== "task") return null;
          return (
            <EditableText
              value={r.data.result ?? ""}
              onCommit={(v) => updateField("tasks", r.id, "result", v || null)}
            />
          );
        },
      },
      {
        id: "notes",
        header: "Notes",
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "uber") return null;
          const table = r.kind === "project" ? "projects" : "tasks";
          return (
            <EditableText
              value={r.data.notes ?? ""}
              onCommit={(v) => updateField(table, r.id, "notes", v || null)}
            />
          );
        },
      },
    ],
    [projectStatuses, taskStatuses]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box p="4">
      <Flex justify="between" align="center" mb="3">
        <Heading size="5">Grid</Heading>
        <Text size="1" color="gray">
          {loading ? "loading…" : `${rows.length} rows`}
        </Text>
      </Flex>
      <Table.Root variant="surface" size="1">
        <Table.Header>
          {table.getHeaderGroups().map((hg) => (
            <Table.Row key={hg.id}>
              {hg.headers.map((h) => (
                <Table.ColumnHeaderCell key={h.id} style={{ width: h.getSize() }}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
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
