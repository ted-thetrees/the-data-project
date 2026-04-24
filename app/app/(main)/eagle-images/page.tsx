import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { getInitialViewParams } from "@/lib/table-views-cookie";
import { EagleImagesTable, type EagleRow, type FolderOption, type TagOption } from "./eagle-images-table";
import { EAGLE_STORAGE_KEY, EAGLE_DEFAULT_WIDTHS } from "./config";

export const metadata = { title: "Eagle Images" };
export const dynamic = "force-dynamic";

async function getRows(): Promise<EagleRow[]> {
  const r = await poolV002.query<EagleRow>(`
    SELECT
      i.id::text           AS image_id,
      i.eagle_id,
      i.name               AS image_name,
      i.ext,
      i.width,
      i.height,
      i.public_url,
      i.is_video,
      COALESCE(
        (SELECT array_agg(folder_id ORDER BY folder_id) FROM eagle_image_folders WHERE image_id = i.id),
        ARRAY[]::text[]
      ) AS folder_ids,
      COALESCE(
        (SELECT array_agg(tag_id::text ORDER BY tag_id) FROM eagle_image_tags WHERE image_id = i.id),
        ARRAY[]::text[]
      ) AS tag_ids,
      n.id::text           AS note_id,
      n.note,
      n.sort_order
    FROM eagle_images i
    LEFT JOIN eagle_image_notes n ON n.image_id = i.id
    ORDER BY i.added_at DESC, n.sort_order NULLS LAST, n.created_at NULLS LAST
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

export default async function EagleImagesPage() {
  const [rows, folders, tags, initialParams] = await Promise.all([
    getRows(),
    getFolders(),
    getTags(),
    getInitialViewParams(EAGLE_STORAGE_KEY, EAGLE_DEFAULT_WIDTHS),
  ]);

  const imageCount = new Set(rows.map((r) => r.image_id)).size;

  return (
    <PageShell title="Eagle Images" count={imageCount} maxWidth="">
      <Realtime
        tables={[
          "eagle_images",
          "eagle_image_notes",
          "eagle_image_folders",
          "eagle_image_tags",
          "eagle_folders",
        ]}
      />
      <Subtitle>
        Images imported from the Eagle library. Multiple notes per image are supported; group by Image to stack them.
      </Subtitle>
      <EagleImagesTable
        rows={rows}
        folders={folders}
        tags={tags}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
