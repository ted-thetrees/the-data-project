import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { PicklistStatusTable } from "../picklist-tables";
import {
  getPalettes,
  getUserStoryRoles,
  getUserStoryCategories,
} from "../lib";

export const metadata = { title: "Pick Lists · User Stories" };
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

export default async function PickListsUserStoriesPage() {
  const [roles, categories, palettes] = await Promise.all([
    getUserStoryRoles(),
    getUserStoryCategories(),
    getPalettes(),
  ]);

  return (
    <PageShell title="Pick Lists · User Stories">
      <Realtime
        tables={[
          "user_story_roles",
          "user_story_categories",
          "color_palettes",
        ]}
      />
      <div className="space-y-10">
        <PickListSection title="User Story Roles" usedBy="User Stories">
          <PicklistStatusTable
            source="user_story_roles"
            rows={roles}
            palettes={palettes}
            storageKey="pick-lists:user_story_roles"
          />
        </PickListSection>

        <PickListSection title="User Story Categories" usedBy="User Stories">
          <PicklistStatusTable
            source="user_story_categories"
            rows={categories}
            palettes={palettes}
            storageKey="pick-lists:user_story_categories"
          />
        </PickListSection>
      </div>
    </PageShell>
  );
}
