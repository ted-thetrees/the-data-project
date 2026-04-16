import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import {
  getPalettes,
  getBacklogPriorities,
  getBacklogCategories,
  getBacklogYesOrNotYet,
  getBacklogDesignParadigms,
  getBacklogStatuses,
  getBacklogPrototypeStages,
} from "../lib";

export const metadata = { title: "Pick Lists · Backlog" };
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

export default async function PickListsBacklogPage() {
  const [
    priorities,
    categories,
    yesOrNotYet,
    designParadigms,
    statuses,
    prototypeStages,
    palettes,
  ] = await Promise.all([
    getBacklogPriorities(),
    getBacklogCategories(),
    getBacklogYesOrNotYet(),
    getBacklogDesignParadigms(),
    getBacklogStatuses(),
    getBacklogPrototypeStages(),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · Backlog">
      <Realtime
        tables={[
          "backlog_priorities",
          "backlog_categories",
          "backlog_yes_or_not_yet",
          "backlog_design_paradigms",
          "backlog_statuses",
          "backlog_prototype_stages",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="Backlog Priorities" usedBy="Backlog">
          <PicklistStatusTable
            source="backlog_priorities"
            rows={priorities}
            palettes={palettes}
            storageKey="pick-lists:backlog_priorities"
          />
        </PickListSection>

        <PickListSection title="Backlog Primary Categories" usedBy="Backlog">
          <PicklistStatusTable
            source="backlog_categories"
            rows={categories}
            palettes={palettes}
            storageKey="pick-lists:backlog_categories"
          />
        </PickListSection>

        <PickListSection title="Backlog Statuses" usedBy="Backlog">
          <PicklistStatusTable
            source="backlog_statuses"
            rows={statuses}
            palettes={palettes}
            storageKey="pick-lists:backlog_statuses"
          />
        </PickListSection>

        <PickListSection title="Backlog Yes or Not Yet" usedBy="Backlog">
          <PicklistStatusTable
            source="backlog_yes_or_not_yet"
            rows={yesOrNotYet}
            palettes={palettes}
            storageKey="pick-lists:backlog_yes_or_not_yet"
          />
        </PickListSection>

        <PickListSection title="Backlog Design Paradigms" usedBy="Backlog">
          <PicklistStatusTable
            source="backlog_design_paradigms"
            rows={designParadigms}
            palettes={palettes}
            storageKey="pick-lists:backlog_design_paradigms"
          />
        </PickListSection>

        <PickListSection title="Backlog Prototype Stages" usedBy="Backlog">
          <PicklistStatusTable
            source="backlog_prototype_stages"
            rows={prototypeStages}
            palettes={palettes}
            storageKey="pick-lists:backlog_prototype_stages"
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
