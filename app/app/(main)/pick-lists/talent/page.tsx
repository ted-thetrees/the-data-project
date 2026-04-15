import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable, PicklistColorTable } from "../picklist-tables";
import {
  getPalettes,
  getTalentCategories,
  getTalentRatingLevels,
  getTalentAreas,
  getPicklistColorsForTables,
} from "../lib";

export const metadata = { title: "Pick Lists · Talent" };
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

export default async function PickListsTalentPage() {
  const [categories, ratingLevels, areas, legacyColors, palettes] =
    await Promise.all([
      getTalentCategories(),
      getTalentRatingLevels(),
      getTalentAreas(),
      getPicklistColorsForTables(["talent", "Talent"]),
      getPalettes(),
    ]);

  return (
    <PageShell title="Pick Lists · Talent">
      <Realtime
        tables={[
          "talent_categories",
          "talent_rating_levels",
          "talent_areas",
          "picklist_colors",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="Talent Categories" usedBy="Talent">
          <PicklistStatusTable
            source="talent_categories"
            rows={categories}
            palettes={palettes}
            storageKey="pick-lists:talent_categories"
          />
        </PickListSection>

        <PickListSection title="Talent Rating Levels" usedBy="Talent">
          <PicklistStatusTable
            source="talent_rating_levels"
            rows={ratingLevels}
            palettes={palettes}
            storageKey="pick-lists:talent_rating_levels"
          />
        </PickListSection>

        <PickListSection title="Talent Areas" usedBy="Talent (areas of expertise)">
          <PicklistStatusTable
            source="talent_areas"
            rows={areas}
            palettes={palettes}
            storageKey="pick-lists:talent_areas"
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
