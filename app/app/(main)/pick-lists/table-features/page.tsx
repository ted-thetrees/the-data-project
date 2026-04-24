import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import { getPalettes, getTablesFeatureStatuses } from "../lib";

export const metadata = { title: "Pick Lists · Table Features" };
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

export default async function PickListsTableFeaturesPage() {
  const [statuses, palettes] = await Promise.all([
    getTablesFeatureStatuses(),
    getPalettes(),
  ]);
  return (
    <PageShell title="Pick Lists · Table Features">
      <Realtime tables={["tables_feature_statuses", "color_palettes"]} />
      <div className="space-y-10">
        <PickListSection
          title="Coverage Status"
          usedBy="Table Features cross-tab"
        >
          <PicklistStatusTable
            source="tables_feature_statuses"
            rows={statuses}
            palettes={palettes}
            storageKey="pick-lists:tables_feature_statuses"
            sortable
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
