export const dynamic = "force-dynamic";
export const metadata = { title: "Projects v005" };

import { getProjectMatrix } from "@/lib/db";
import { ClaudeTree } from "./claude-tree";
import "./theme.css";

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
}

export interface TreeTask {
  key: string;
  nodeType: "uber" | "project" | "task";
  name: string;
  tickleDate?: string | null;
  taskIds?: string[];
  taskStatus?: string;
  taskResult?: string;
  taskNotes?: string;
  children?: TreeTask[];
}

function buildTree(tasks: Task[]): TreeTask[] {
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

  const tree: TreeTask[] = [];

  for (const [uber, projectMap] of uberMap) {
    const sortedProjects = [...projectMap.entries()].sort(([, a], [, b]) => {
      const da = a[0]?.tickle_date ? new Date(a[0].tickle_date).getTime() : Infinity;
      const db = b[0]?.tickle_date ? new Date(b[0].tickle_date).getTime() : Infinity;
      return da - db;
    });

    const uberChildren: TreeTask[] = [];

    for (const [project, projectTasks] of sortedProjects) {
      const sortedTasks = [...projectTasks].sort(
        (a, b) =>
          (statusOrder[a.task_status] ?? 0) - (statusOrder[b.task_status] ?? 0) ||
          (a.task || "").localeCompare(b.task || "")
      );

      uberChildren.push({
        key: `project-${uber}-${project}`,
        nodeType: "project",
        name: project,
        tickleDate: projectTasks[0]?.tickle_date,
        taskIds: sortedTasks.map((t) => t.id),
        children: sortedTasks.map((t) => ({
          key: t.id,
          nodeType: "task" as const,
          name: t.task || "(no task)",
          taskStatus: t.task_status,
          taskResult: t.task_result || "",
          taskNotes: t.task_notes || "",
        })),
      });
    }

    tree.push({
      key: `uber-${uber}`,
      nodeType: "uber",
      name: uber,
      children: uberChildren,
    });
  }

  return tree;
}

export default async function ProjectsV5Page() {
  const tasks = (await getProjectMatrix()) as Task[];
  const treeData = buildTree(tasks);

  return <ClaudeTree treeData={treeData} taskCount={tasks.length} />;
}
