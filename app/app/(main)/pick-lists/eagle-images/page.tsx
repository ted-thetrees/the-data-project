import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import { getPalettes, getEagleBubbleDistributions } from "../lib";

export const metadata = { title: "Pick Lists · Eagle Images" };
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

export default async function PickListsEagleImagesPage() {
  const [bubbleDistributions, palettes] = await Promise.all([
    getEagleBubbleDistributions(),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · Eagle Images">
      <Realtime tables={["eagle_bubble_distributions", "color_palettes"]} />
      <div className="space-y-10">
        <PickListSection title="Bubble Distribution" usedBy="Eagle Images · List">
          <PicklistStatusTable
            source="eagle_bubble_distributions"
            rows={bubbleDistributions}
            palettes={palettes}
            storageKey="pick-lists:eagle_bubble_distributions"
            sortable
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
