export const dynamic = "force-dynamic";

import { getProjectMatrix } from "@/lib/db";
import { ProjectOutline } from "./project-outline";

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

  for (const [uber, projectMap] of uberMap) {
    const uberChildren: any[] = [];

    for (const [project, tasks] of projectMap) {
      const tickleDate = tasks[0]?.tickle_date;
      const projectChildren = tasks.map((t) => ({
        id: t.id,
        name: t.task || "(no task)",
        data: {
          type: "task" as const,
          taskStatus: t.task_status,
          taskResult: t.task_result,
          taskNotes: t.task_notes,
        },
      }));

      uberChildren.push({
        id: `project-${uber}-${project}`,
        name: project,
        children: projectChildren,
        data: {
          type: "project" as const,
          tickleDate,
          projectStatus: tasks[0]?.project_status,
          projectNotes: tasks[0]?.project_notes,
          taskIds: tasks.map((t) => t.id),
        },
      });
    }

    tree.push({
      id: `uber-${uber}`,
      name: uber,
      children: uberChildren,
      data: { type: "uber" as const },
    });
  }

  return tree;
}

export default async function ProjectsPage() {
  const tasks = (await getProjectMatrix()) as Task[];
  const tree = buildTree(tasks);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <span className="text-sm text-muted-foreground">
            {tasks.length} tasks
          </span>
        </div>
        <ProjectOutline initialData={tree} />
      </div>
    </div>
  );
}
