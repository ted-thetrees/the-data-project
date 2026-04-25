import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable, PicklistColorTable } from "../picklist-tables";
import {
  getPalettes,
  getProjectStatuses,
  getProjectActionOrderStatuses,
  getProjectEntryStatuses,
  getTaskStatuses,
  getUberProjectsForPickList,
  getPicklistColorsForTables,
} from "../lib";

export const metadata = { title: "Pick Lists · Projects" };
export const dynamic = "force-dynamic";

function PickListSection({
  title,
  usedBy,
  children,
}: {
  title: string;
  usedBy: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-3">Used by: {usedBy}</p>
      {children}
    </section>
  );
}

export default async function PickListsProjectsPage() {
  const [
    projectStatuses,
    actionOrderStatuses,
    entryStatuses,
    taskStatuses,
    uberProjects,
    legacyColors,
    palettes,
  ] = await Promise.all([
    getProjectStatuses(),
    getProjectActionOrderStatuses(),
    getProjectEntryStatuses(),
    getTaskStatuses(),
    getUberProjectsForPickList(),
    getPicklistColorsForTables(["Projects", "Tasks", "projects", "tasks"]),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · Projects">
      <Realtime
        tables={[
          "project_statuses",
          "project_action_order_statuses",
          "project_entry_statuses",
          "task_statuses",
          "uber_projects",
          "picklist_colors",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="Project Statuses" usedBy="Projects">
          <PicklistStatusTable
            source="project_statuses"
            rows={projectStatuses}
            palettes={palettes}
            showVisible
            sortable
            storageKey="pick-lists:project_statuses"
          />
        </PickListSection>

        <PickListSection title="Action Order" usedBy="Projects">
          <PicklistStatusTable
            source="project_action_order_statuses"
            rows={actionOrderStatuses}
            palettes={palettes}
            sortable
            storageKey="pick-lists:project_action_order_statuses"
          />
        </PickListSection>

        <PickListSection title="Entry Status" usedBy="Projects">
          <PicklistStatusTable
            source="project_entry_statuses"
            rows={entryStatuses}
            palettes={palettes}
            sortable
            storageKey="pick-lists:project_entry_statuses"
          />
        </PickListSection>

        <PickListSection title="Task Statuses" usedBy="Tasks">
          <PicklistStatusTable
            source="task_statuses"
            rows={taskStatuses}
            palettes={palettes}
            sortable
            storageKey="pick-lists:task_statuses"
          />
        </PickListSection>

        <PickListSection title="Uber Projects" usedBy="Projects">
          <PicklistStatusTable
            source="uber_projects"
            rows={uberProjects}
            palettes={palettes}
            sortable
            storageKey="pick-lists:uber_projects"
          />
        </PickListSection>

        {Array.from(legacyColors.entries()).map(([key, rows]) => (
          <PickListSection key={key} title={`${key} (legacy)`} usedBy={rows[0].table}>
            <PicklistColorTable
              rows={rows}
              palettes={palettes}
              storageKey={`pick-lists:${rows[0].table}:${rows[0].field}`}
            />
          </PickListSection>
        ))}
      </div>
    </PageShell>
  );
}
