export const dynamic = "force-dynamic";
export const metadata = { title: "Projects v003" };

import { getProjectMatrix } from "@/lib/db";
import { HeadlessTree } from "./headless-tree";

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

interface TreeItem {
  itemName: string;
  nodeType: "uber" | "project" | "task";
  childrenIds: string[];
  tickleDate?: string;
  taskIds?: string[];
  taskStatus?: string;
  taskResult?: string;
  taskNotes?: string;
}

function buildTreeData(tasks: Task[]): Record<string, TreeItem> {
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

  const items: Record<string, TreeItem> = {};
  const rootChildren: string[] = [];

  for (const [uber, projectMap] of uberMap) {
    const uberId = `uber-${uber}`;
    const uberChildIds: string[] = [];

    const sortedProjects = [...projectMap.entries()].sort(([, a], [, b]) => {
      const da = a[0]?.tickle_date ? new Date(a[0].tickle_date).getTime() : Infinity;
      const db = b[0]?.tickle_date ? new Date(b[0].tickle_date).getTime() : Infinity;
      return da - db;
    });

    for (const [project, projectTasks] of sortedProjects) {
      const projectId = `project-${uber}-${project}`;
      const sortedTasks = [...projectTasks].sort(
        (a, b) =>
          (statusOrder[a.task_status] ?? 0) - (statusOrder[b.task_status] ?? 0) ||
          (a.task || "").localeCompare(b.task || "")
      );

      const taskIds = sortedTasks.map((t) => t.id);

      items[projectId] = {
        itemName: project,
        nodeType: "project",
        childrenIds: taskIds,
        tickleDate: projectTasks[0]?.tickle_date || undefined,
        taskIds,
      };

      for (const t of sortedTasks) {
        items[t.id] = {
          itemName: t.task || "(no task)",
          nodeType: "task",
          childrenIds: [],
          taskStatus: t.task_status,
          taskResult: t.task_result || "",
          taskNotes: t.task_notes || "",
        };
      }

      uberChildIds.push(projectId);
    }

    items[uberId] = {
      itemName: uber,
      nodeType: "uber",
      childrenIds: uberChildIds,
    };
    rootChildren.push(uberId);
  }

  items["root"] = {
    itemName: "Root",
    nodeType: "uber",
    childrenIds: rootChildren,
  };

  return items;
}

export default async function ProjectsV3Page() {
  const tasks = (await getProjectMatrix()) as Task[];
  const treeData = buildTreeData(tasks);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto" style={{ maxWidth: "100%" }}>
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Projects v3</h1>
          <span className="text-sm text-muted-foreground">{tasks.length} tasks</span>
        </div>
        <HeadlessTree initialData={treeData} />
      </div>
    </div>
  );
}
