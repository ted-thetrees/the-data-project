import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { UserStoriesTable, type UserStoryRow } from "./user-stories-table";
import {
  USER_STORIES_STORAGE_KEY,
  USER_STORIES_DEFAULT_WIDTHS,
} from "./config";
import type { PillOption } from "@/components/pill";
import { getInitialViewParams } from "@/lib/table-views-cookie";

export const metadata = { title: "User Stories" };
export const dynamic = "force-dynamic";

async function getUserStories(): Promise<UserStoryRow[]> {
  const result = await poolV002.query<UserStoryRow>(`
    SELECT
      us.id::text,
      us.title,
      us.narrative,
      us.category_id::text AS category_id,
      COALESCE(
        (SELECT json_agg(
                  json_build_object('id', r.id::text, 'name', r.name)
                  ORDER BY r.sort_order
                )
         FROM user_story_role_links l
         JOIN user_story_roles r ON r.id = l.role_id
         WHERE l.user_story_id = us.id),
        '[]'::json
      ) AS roles
    FROM user_stories us
    ORDER BY us.sort_order NULLS LAST, us.id DESC
  `);
  return result.rows.map((r) => ({
    ...r,
    roles: r.roles ?? [],
  }));
}

async function getLookupOptions(table: string): Promise<PillOption[]> {
  const result = await poolV002.query(
    `SELECT id::text AS id, name, color
     FROM ${table}
     ORDER BY sort_order NULLS LAST, name`,
  );
  return result.rows;
}

export default async function UserStoriesPage() {
  const [rows, roleOptions, categoryOptions, initialParams] = await Promise.all([
    getUserStories(),
    getLookupOptions("user_story_roles"),
    getLookupOptions("user_story_categories"),
    getInitialViewParams(USER_STORIES_STORAGE_KEY, USER_STORIES_DEFAULT_WIDTHS),
  ]);
  return (
    <PageShell title="User Stories" count={rows.length} maxWidth="">
      <Realtime
        tables={[
          "user_stories",
          "user_story_roles",
          "user_story_categories",
          "user_story_role_links",
        ]}
      />
      <Subtitle>Universal human-needs stories, tagged by role and category.</Subtitle>
      <UserStoriesTable
        rows={rows}
        roleOptions={roleOptions}
        categoryOptions={categoryOptions}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
