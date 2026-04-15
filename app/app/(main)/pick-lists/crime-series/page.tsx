import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import { getPalettes, getCrimeSeriesStatuses } from "../lib";

export const metadata = { title: "Pick Lists · Crime Series" };
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

export default async function PickListsCrimeSeriesPage() {
  const [crimeSeriesStatuses, palettes] = await Promise.all([
    getCrimeSeriesStatuses(),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · Crime Series">
      <Realtime tables={["crime_series_statuses", "color_palettes"]} />
      <div className="space-y-10">
        <PickListSection title="Crime Series Statuses" usedBy="Crime Series">
          <PicklistStatusTable
            source="crime_series_statuses"
            rows={crimeSeriesStatuses}
            palettes={palettes}
            storageKey="pick-lists:crime_series_statuses"
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
