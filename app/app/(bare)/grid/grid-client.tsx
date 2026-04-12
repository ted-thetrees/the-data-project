"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column, type ColumnEditorOptions } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";
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

  const tableOptions = [
    { label: "Tasks", value: "tasks" },
    { label: "Projects", value: "projects" },
    { label: "Uber", value: "uber_projects" },
  ];

  return (
    <div style={{ padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Grid</h1>
        <SelectButton
          value={tableKind}
          onChange={(e) => e.value && setTableKind(e.value as TableKind)}
          options={tableOptions}
          allowEmpty={false}
        />
      </div>

      {tableKind === "tasks" && (
        <TasksTable
          data={joinedTasks}
          taskStatuses={taskStatuses}
          projects={joinedProjects}
          updateTask={updateTask}
          loading={loading}
        />
      )}
      {tableKind === "projects" && (
        <ProjectsTable
          data={joinedProjects}
          projectStatuses={projectStatuses}
          ubers={ubers}
          updateProject={updateProject}
          loading={loading}
        />
      )}
      {tableKind === "uber_projects" && (
        <UbersTable data={ubers} updateUber={updateUber} loading={loading} />
      )}
    </div>
  );
}

const commonTableProps = {
  paginator: true,
  rows: 50,
  rowsPerPageOptions: [25, 50, 100, 200],
  removableSort: true,
  filterDisplay: "menu" as const,
  resizableColumns: true,
  columnResizeMode: "expand" as const,
  reorderableColumns: true,
  scrollable: true,
  scrollHeight: "calc(100vh - 260px)",
  stripedRows: true,
  showGridlines: false,
  size: "small" as const,
  dataKey: "id",
};

function groupingProps(groupBy: string | null) {
  if (!groupBy) return { sortMode: "multiple" as const };
  return {
    rowGroupMode: "rowspan" as const,
    groupRowsBy: groupBy,
    sortMode: "single" as const,
    sortField: groupBy,
    sortOrder: 1 as 1,
  };
}

function GroupByControl({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Group by:</span>
      <Dropdown
        value={value}
        options={options}
        onChange={(e) => onChange(e.value ?? null)}
        placeholder="(none)"
        showClear
        style={{ width: "14rem" }}
      />
    </div>
  );
}

function TasksTable({
  data,
  taskStatuses,
  projects,
  updateTask,
  loading,
}: {
  data: JoinedTask[];
  taskStatuses: Status[];
  projects: JoinedProject[];
  updateTask: (id: string, field: keyof Task, value: unknown) => Promise<void>;
  loading: boolean;
}) {
  const [groupBy, setGroupBy] = useState<string | null>(null);

  const onCellEditComplete = (e: {
    rowData: JoinedTask;
    newValue: unknown;
    field: string;
  }) => {
    const { rowData, newValue, field } = e;
    if (newValue === (rowData as Record<string, unknown>)[field]) return;
    updateTask(rowData.id, field as keyof Task, newValue);
  };

  return (
    <>
      <GroupByControl
        value={groupBy}
        onChange={setGroupBy}
        options={[
          { label: "Status", value: "status_name" },
          { label: "Project", value: "project_name" },
          { label: "Uber Project", value: "uber_project_name" },
        ]}
      />
      <DataTable
        {...commonTableProps}
        {...groupingProps(groupBy)}
        value={data}
        loading={loading}
        editMode="cell"
        emptyMessage="No tasks"
      >
      <Column
        field="name"
        header="Name"
        sortable
        filter
        filterPlaceholder="Search name"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "16rem" }}
      />
      <Column
        field="status_id"
        header="Status"
        sortField="status_name"
        filterField="status_name"
        sortable
        filter
        body={(row: JoinedTask) => row.status_name ?? "—"}
        editor={(opts) => statusEditor(opts, taskStatuses)}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "10rem" }}
      />
      <Column
        field="project_id"
        header="Project"
        sortField="project_name"
        filterField="project_name"
        sortable
        filter
        body={(row: JoinedTask) => row.project_name ?? "—"}
        editor={(opts) =>
          relationEditor(
            opts,
            projects.map((p) => ({ id: p.id, name: p.name }))
          )
        }
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "14rem" }}
      />
      <Column
        field="uber_project_name"
        header="Uber Project"
        sortable
        filter
        filterPlaceholder="Search uber"
        style={{ minWidth: "12rem" }}
      />
      <Column
        field="order"
        header="Order"
        sortable
        editor={numberEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ width: "6rem" }}
      />
      <Column
        field="result"
        header="Result"
        sortable
        filter
        filterPlaceholder="Search result"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "14rem" }}
      />
      <Column
        field="notes"
        header="Notes"
        sortable
        filter
        filterPlaceholder="Search notes"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "16rem" }}
      />
      </DataTable>
    </>
  );
}

function ProjectsTable({
  data,
  projectStatuses,
  ubers,
  updateProject,
  loading,
}: {
  data: JoinedProject[];
  projectStatuses: Status[];
  ubers: UberProject[];
  updateProject: (id: string, field: keyof Project, value: unknown) => Promise<void>;
  loading: boolean;
}) {
  const [groupBy, setGroupBy] = useState<string | null>(null);

  const onCellEditComplete = (e: {
    rowData: JoinedProject;
    newValue: unknown;
    field: string;
  }) => {
    const { rowData, newValue, field } = e;
    if (newValue === (rowData as Record<string, unknown>)[field]) return;
    updateProject(rowData.id, field as keyof Project, newValue);
  };

  return (
    <>
      <GroupByControl
        value={groupBy}
        onChange={setGroupBy}
        options={[
          { label: "Status", value: "status_name" },
          { label: "Uber Project", value: "uber_project_name" },
        ]}
      />
      <DataTable
        {...commonTableProps}
        {...groupingProps(groupBy)}
        value={data}
        loading={loading}
        editMode="cell"
        emptyMessage="No projects"
      >
      <Column
        field="name"
        header="Name"
        sortable
        filter
        filterPlaceholder="Search name"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "16rem" }}
      />
      <Column
        field="status_id"
        header="Status"
        sortField="status_name"
        filterField="status_name"
        sortable
        filter
        body={(row: JoinedProject) => row.status_name ?? "—"}
        editor={(opts) => statusEditor(opts, projectStatuses)}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "10rem" }}
      />
      <Column
        field="uber_project_id"
        header="Uber Project"
        sortField="uber_project_name"
        filterField="uber_project_name"
        sortable
        filter
        body={(row: JoinedProject) => row.uber_project_name ?? "—"}
        editor={(opts) =>
          relationEditor(
            opts,
            ubers.map((u) => ({ id: u.id, name: u.name }))
          )
        }
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "14rem" }}
      />
      <Column
        field="tickle_date"
        header="Tickle"
        sortable
        filter
        filterPlaceholder="YYYY-MM-DD"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ width: "9rem" }}
      />
      <Column
        field="order"
        header="Order"
        sortable
        editor={numberEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ width: "6rem" }}
      />
      <Column
        field="notes"
        header="Notes"
        sortable
        filter
        filterPlaceholder="Search notes"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "16rem" }}
      />
      </DataTable>
    </>
  );
}

function UbersTable({
  data,
  updateUber,
  loading,
}: {
  data: UberProject[];
  updateUber: (id: string, field: keyof UberProject, value: unknown) => Promise<void>;
  loading: boolean;
}) {
  const onCellEditComplete = (e: {
    rowData: UberProject;
    newValue: unknown;
    field: string;
  }) => {
    const { rowData, newValue, field } = e;
    if (newValue === (rowData as Record<string, unknown>)[field]) return;
    updateUber(rowData.id, field as keyof UberProject, newValue);
  };

  return (
    <DataTable
      {...commonTableProps}
      value={data}
      loading={loading}
      editMode="cell"
      emptyMessage="No uber projects"
    >
      <Column
        field="name"
        header="Name"
        sortable
        filter
        filterPlaceholder="Search name"
        editor={textEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ minWidth: "20rem" }}
      />
      <Column
        field="order"
        header="Order"
        sortable
        editor={numberEditor}
        onCellEditComplete={onCellEditComplete}
        style={{ width: "6rem" }}
      />
    </DataTable>
  );
}

function textEditor(options: ColumnEditorOptions) {
  return (
    <InputText
      type="text"
      value={(options.value as string) ?? ""}
      onChange={(e) => options.editorCallback?.(e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ width: "100%" }}
    />
  );
}

function numberEditor(options: ColumnEditorOptions) {
  return (
    <InputNumber
      value={options.value as number | null}
      onValueChange={(e) => options.editorCallback?.(e.value ?? null)}
      onKeyDown={(e) => e.stopPropagation()}
      inputStyle={{ width: "100%" }}
    />
  );
}

function statusEditor(options: ColumnEditorOptions, statuses: Status[]) {
  return (
    <Dropdown
      value={options.value as string | null}
      options={statuses}
      optionLabel="name"
      optionValue="id"
      placeholder="—"
      showClear
      onChange={(e) => options.editorCallback?.(e.value)}
      style={{ width: "100%" }}
    />
  );
}

function relationEditor(
  options: ColumnEditorOptions,
  items: { id: string; name: string }[]
) {
  return (
    <Dropdown
      value={options.value as string | null}
      options={items}
      optionLabel="name"
      optionValue="id"
      placeholder="—"
      filter
      showClear
      onChange={(e) => options.editorCallback?.(e.value)}
      style={{ width: "100%" }}
    />
  );
}
