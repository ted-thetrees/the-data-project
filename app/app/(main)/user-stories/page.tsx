import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { UserStoriesTable, type UserStoryRow } from "./user-stories-table";

export const metadata = { title: "User Stories" };
export const dynamic = "force-dynamic";

async function getUserStories(): Promise<UserStoryRow[]> {
  const result = await poolV002.query<UserStoryRow>(`
    SELECT
      us.id::text,
      us.title,
      us.narrative,
      COALESCE(
        (SELECT array_agg(r.name ORDER BY r.sort_order)
         FROM user_story_role_links l
         JOIN user_story_roles r ON r.id = l.role_id
         WHERE l.user_story_id = us.id),
        ARRAY[]::text[]
      ) AS roles,
      c.name AS category
    FROM user_stories us
    LEFT JOIN user_story_categories c ON c.id = us.category_id
    ORDER BY us.id DESC
  `);
  return result.rows;
}

export default async function UserStoriesPage() {
  const rows = await getUserStories();
  return (
    <PageShell title="User Stories" count={rows.length} maxWidth="">
      <UserStoriesTable rows={rows} />
    </PageShell>
  );
}
