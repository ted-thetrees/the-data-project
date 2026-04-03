export const dynamic = "force-dynamic";
export const metadata = { title: "Projects v002" };

import { getProjectMatrix } from "@/lib/db";
import { ArboristTree } from "./arborist-tree";

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

function buildTree(tasks: Task[]) {
  const uberMap = new Map<string, Map<string, Task[]>>();

  for (const task of tasks) {
    const uber = task.uber_project || "Uncategorized";
    const project = task.project || "No Project";
    if (!uberMap.has(uber)) uberMap.set(uber, new Map());
    const projectMap = uberMap.get(uber)!;
    if (!projectMap.has(project)) projectMap.set(project, []);
    projectMap.get(project)!.push(task);
  }

  const tree: any[] = [];
  const statusOrder: Record<string, number> = { Tickled: 0, Done: 1 };

  for (const [uber, projectMap] of uberMap) {
    const sortedProjects = [...projectMap.entries()].sort(([, a], [, b]) => {
      const da = a[0]?.tickle_date ? new Date(a[0].tickle_date).getTime() : Infinity;
      const db = b[0]?.tickle_date ? new Date(b[0].tickle_date).getTime() : Infinity;
      return da - db;
    });

    const uberChildren: any[] = [];

    for (const [project, tasks] of sortedProjects) {
      const sortedTasks = [...tasks].sort(
        (a, b) => (statusOrder[a.task_status] ?? 0) - (statusOrder[b.task_status] ?? 0)
          || (a.task || "").localeCompare(b.task || "")
      );

      const taskChildren = sortedTasks.map((t) => ({
        id: t.id,
        name: t.task || "(no task)",
        nodeType: "task",
        taskStatus: t.task_status,
        taskResult: t.task_result || "",
        taskNotes: t.task_notes || "",
      }));

      uberChildren.push({
        id: `project-${uber}-${project}`,
        name: project,
        nodeType: "project",
        tickleDate: tasks[0]?.tickle_date,
        taskIds: tasks.map((t) => t.id),
        children: taskChildren,
      });
    }

    tree.push({
      id: `uber-${uber}`,
      name: uber,
      nodeType: "uber",
      children: uberChildren,
    });
  }

  return tree;
}

export default async function ProjectsV2Page() {
  const tasks = (await getProjectMatrix()) as Task[];
  const tree = buildTree(tasks);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto" style={{ maxWidth: "100%" }}>
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Projects v2</h1>
          <span className="text-sm text-muted-foreground">
            {tasks.length} tasks
          </span>
        </div>
        <ArboristTree initialData={tree} />
      </div>
    </div>
  );
}
