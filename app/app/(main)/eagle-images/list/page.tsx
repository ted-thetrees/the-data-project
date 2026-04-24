import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { getInitialViewParams } from "@/lib/table-views-cookie";
import { ListTable, type ListRow, type FolderOption, type TagOption } from "./list-table";
import { LIST_STORAGE_KEY, LIST_DEFAULT_WIDTHS } from "./config";

export const metadata = { title: "Eagle Images — List" };
export const dynamic = "force-dynamic";

async function getRows(): Promise<ListRow[]> {
  const r = await poolV002.query<ListRow>(`
    SELECT
      i.id::text     AS image_id,
      i.eagle_id,
      i.name         AS image_name,
      i.ext,
      i.public_url,
      i.is_video,
      i.width,
      i.height,
      COALESCE(
        (SELECT array_agg(folder_id) FROM eagle_image_folders WHERE image_id = i.id),
        ARRAY[]::text[]
      ) AS folder_ids,
      COALESCE(
        (SELECT array_agg(tag_id::text) FROM eagle_image_tags WHERE image_id = i.id),
        ARRAY[]::text[]
      ) AS tag_ids
    FROM eagle_images i
    ORDER BY i.added_at DESC
  `);
  return r.rows;
}

async function getFolders(): Promise<FolderOption[]> {
  const r = await poolV002.query<FolderOption>(
    `SELECT id, name, full_path, color FROM eagle_folders ORDER BY full_path`,
  );
  return r.rows;
}

async function getTags(): Promise<TagOption[]> {
  const r = await poolV002.query<TagOption>(
    `SELECT id::text AS id, name FROM eagle_tags ORDER BY name`,
  );
  return r.rows;
}

export default async function EagleListPage() {
  const [rows, folders, tags, initialParams] = await Promise.all([
    getRows(),
    getFolders(),
    getTags(),
    getInitialViewParams(LIST_STORAGE_KEY, LIST_DEFAULT_WIDTHS),
  ]);

  return (
    <PageShell title="Eagle Images — List" count={rows.length} maxWidth="">
      <Realtime
        tables={[
          "eagle_images",
          "eagle_image_folders",
          "eagle_image_tags",
          "eagle_folders",
          "eagle_tags",
        ]}
      />
      <Subtitle>One row per image. Group by Folder or Tag — images in Eagle&rsquo;s &ldquo;Yes&rdquo; folder are tagged <code>Yes</code>.</Subtitle>
      <ListTable
        rows={rows}
        folders={folders}
        tags={tags}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
