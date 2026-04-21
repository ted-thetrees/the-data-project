import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import {
  getPalettes,
  getGetCategories,
  getGetStatuses,
  getGetSources,
} from "../lib";

export const metadata = { title: "Pick Lists · Get" };
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

export default async function PickListsGetPage() {
  const [categories, statuses, sources, palettes] = await Promise.all([
    getGetCategories(),
    getGetStatuses(),
    getGetSources(),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · Get">
      <Realtime
        tables={[
          "get_categories",
          "get_statuses",
          "get_sources",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="Get Categories" usedBy="Get">
          <PicklistStatusTable
            source="get_categories"
            rows={categories}
            palettes={palettes}
            storageKey="pick-lists:get_categories"
          />
        </PickListSection>

        <PickListSection title="Get Statuses" usedBy="Get">
          <PicklistStatusTable
            source="get_statuses"
            rows={statuses}
            palettes={palettes}
            storageKey="pick-lists:get_statuses"
          />
        </PickListSection>

        <PickListSection title="Get Sources" usedBy="Get">
          <PicklistStatusTable
            source="get_sources"
            rows={sources}
            palettes={palettes}
            storageKey="pick-lists:get_sources"
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
