import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import {
  getPalettes,
  getInfImagesBubbleDistributions,
  getInfImagesFolders,
  getInfImageStatuses,
} from "../lib";

export const metadata = { title: "Pick Lists · INF Images" };
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

export default async function PickListsInfImagesPage() {
  const [bubbleDistributions, statuses, folders, palettes] = await Promise.all([
    getInfImagesBubbleDistributions(),
    getInfImageStatuses(),
    getInfImagesFolders(),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · INF Images">
      <Realtime
        tables={[
          "inf_images_bubble_distributions",
          "inf_image_statuses",
          "inf_images_folders",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection
          title="Status"
          usedBy="Status column on INF Images · List"
        >
          <PicklistStatusTable
            source="inf_image_statuses"
            rows={statuses}
            palettes={palettes}
            storageKey="pick-lists:inf_image_statuses"
            sortable
          />
        </PickListSection>
        <PickListSection
          title="Sort / Yes / No"
          usedBy="Bubble Distribution + every Folder column on INF Images · List"
        >
          <PicklistStatusTable
            source="inf_images_bubble_distributions"
            rows={bubbleDistributions}
            palettes={palettes}
            storageKey="pick-lists:inf_images_bubble_distributions"
            sortable
          />
        </PickListSection>
        <PickListSection
          title="Folders"
          usedBy="INF Images · Grid and INF Images · List"
        >
          <PicklistStatusTable
            source="inf_images_folders"
            rows={folders}
            palettes={palettes}
            storageKey="pick-lists:inf_images_folders"
            sortable
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
