import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable, PicklistColorTable } from "../picklist-tables";
import {
  getPalettes,
  getPeopleFamiliarityLevels,
  getPeopleGenders,
  getPeopleTellerStatuses,
  getPeopleOrgFillStatuses,
  getPeopleMetroAreas,
  getPicklistColorsForTables,
} from "../lib";

export const metadata = { title: "Pick Lists · People" };
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

export default async function PickListsPeoplePage() {
  const [
    familiarity,
    genders,
    tellerStatuses,
    orgFillStatuses,
    metroAreas,
    legacyColors,
    palettes,
  ] = await Promise.all([
    getPeopleFamiliarityLevels(),
    getPeopleGenders(),
    getPeopleTellerStatuses(),
    getPeopleOrgFillStatuses(),
    getPeopleMetroAreas(),
    getPicklistColorsForTables(["People"]),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · People">
      <Realtime
        tables={[
          "people_familiarity_levels",
          "people_genders",
          "people_teller_statuses",
          "people_org_fill_statuses",
          "people_metro_areas",
          "picklist_colors",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="People Familiarity Levels" usedBy="People">
          <PicklistStatusTable
            source="people_familiarity_levels"
            rows={familiarity}
            palettes={palettes}
            storageKey="pick-lists:people_familiarity_levels"
          />
        </PickListSection>

        <PickListSection title="People Genders" usedBy="People">
          <PicklistStatusTable
            source="people_genders"
            rows={genders}
            palettes={palettes}
            storageKey="pick-lists:people_genders"
          />
        </PickListSection>

        <PickListSection title="People Teller Statuses" usedBy="People">
          <PicklistStatusTable
            source="people_teller_statuses"
            rows={tellerStatuses}
            palettes={palettes}
            storageKey="pick-lists:people_teller_statuses"
          />
        </PickListSection>

        <PickListSection title="People Has Org Filled" usedBy="People">
          <PicklistStatusTable
            source="people_org_fill_statuses"
            rows={orgFillStatuses}
            palettes={palettes}
            storageKey="pick-lists:people_org_fill_statuses"
          />
        </PickListSection>

        <PickListSection title="People Metro Areas" usedBy="People">
          <PicklistStatusTable
            source="people_metro_areas"
            rows={metroAreas}
            palettes={palettes}
            showFullName
            storageKey="pick-lists:people_metro_areas"
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
