export const dynamic = "force-dynamic";
export const metadata = { title: "Projects v006" };

import { getProjectMatrix } from "@/lib/db";
import { ProjectsTable } from "./projects-table";
import "../projects-v5/theme.css";

interface Task {
  id: string;
  uber_project: string;
  task_status: string;
  task: string;
  task_result: string | null;
  task_notes: string | null;
  tickle_date: string | null;
  project_status: string | null;
  project_notes: string | null;
  project: string;
  created_date: string | null;
}

export interface ProjectRow {
  id: string;
  nodeType: "uber" | "project" | "task";
  name: string;
  taskStatus?: string;
  taskResult?: string;
  taskNotes?: string;
  tickleDate?: string | null;
  createdDate?: string | null;
  taskCount?: number;
  subRows?: ProjectRow[];
}

function buildTree(tasks: Task[]): ProjectRow[] {
  const uberMap = new Map<string, Map<string, Task[]>>();
  const statusOrder: Record<string, number> = { Tickled: 0, Done: 1 };

  for (const task of tasks) {
    const uber = task.uber_project || "Uncategorized";
    const project = task.project || "No Project";
    if (!uberMap.has(uber)) uberMap.set(uber, new Map());
    const projectMap = uberMap.get(uber)!;
    if (!projectMap.has(project)) projectMap.set(project, []);
    projectMap.get(project)!.push(task);
  }

  const tree: ProjectRow[] = [];

  for (const [uber, projectMap] of uberMap) {
    const sortedProjects = [...projectMap.entries()].sort(([, a], [, b]) => {
      const da = a[0]?.tickle_date ? new Date(a[0].tickle_date).getTime() : Infinity;
      const db = b[0]?.tickle_date ? new Date(b[0].tickle_date).getTime() : Infinity;
      return da - db;
    });

    const uberChildren: ProjectRow[] = [];

    for (const [project, projectTasks] of sortedProjects) {
      const sortedTasks = [...projectTasks].sort(
        (a, b) =>
          (statusOrder[a.task_status] ?? 0) - (statusOrder[b.task_status] ?? 0) ||
          (a.task || "").localeCompare(b.task || "")
      );

      uberChildren.push({
        id: `project-${uber}-${project}`,
        nodeType: "project",
        name: project,
        tickleDate: projectTasks[0]?.tickle_date,
        taskCount: sortedTasks.length,
        subRows: sortedTasks.map((t) => ({
          id: t.id,
          nodeType: "task" as const,
          name: t.task || "(no task)",
          taskStatus: t.task_status,
          taskResult: t.task_result || "",
          taskNotes: t.task_notes || "",
          createdDate: t.created_date,
        })),
      });
    }

    tree.push({
      id: `uber-${uber}`,
      nodeType: "uber",
      name: uber,
      taskCount: uberChildren.reduce((sum, p) => sum + (p.taskCount || 0), 0),
      subRows: uberChildren,
    });
  }

  return tree;
}

export default async function ProjectsV6Page() {
  const tasks = (await getProjectMatrix()) as Task[];
  const treeData = buildTree(tasks);

  return <ProjectsTable data={treeData} taskCount={tasks.length} />;
}
