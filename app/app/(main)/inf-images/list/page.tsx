import { unstable_cache } from "next/cache";
import { poolV002 } from "@/lib/db";
import { PageShell } from "@/components/page-shell";
import { Realtime } from "@/components/realtime";
import { Subtitle } from "@/components/subtitle";
import { getInitialViewParams } from "@/lib/table-views-cookie";
import { ListTable, type ListRow, type FolderOption, type TagOption } from "./list-table";
import { LIST_STORAGE_KEY, LIST_DEFAULT_WIDTHS } from "./config";
import {
  getInfImagesBubbleDistributions,
  getInfImageStatuses,
} from "../../pick-lists/lib";
import type { PillOption } from "@/components/pill";

export const metadata = { title: "INF Images — List" };
export const dynamic = "force-dynamic";

async function getRows(): Promise<ListRow[]> {
  const r = await poolV002.query<ListRow>(`
    SELECT
      i.id::text                          AS image_id,
      i.eagle_id,
      i.name                              AS image_name,
      i.ext,
      i.public_url,
      i.is_video,
      i.width,
      i.height,
      i.bubble_distribution_id::text      AS bubble_distribution_id,
      i.status_id::text                   AS status_id,
      COALESCE(
        (SELECT jsonb_object_agg(folder_id, status_id::text)
           FROM inf_images_folder_links WHERE image_id = i.id),
        '{}'::jsonb
      ) AS folder_statuses,
      COALESCE(
        (SELECT array_agg(tag_id::text) FROM inf_images_tag_links WHERE image_id = i.id),
        ARRAY[]::text[]
      ) AS tag_ids
    FROM inf_images i
    ORDER BY i.added_at DESC
  `);
  return r.rows;
}

const getCachedRows = unstable_cache(getRows, ["inf-images-rows-v1"], {
  tags: ["inf-images"],
  revalidate: 30,
});

async function getFolders(): Promise<FolderOption[]> {
  const r = await poolV002.query<FolderOption>(
    `SELECT id, name, full_path, color FROM inf_images_folders ORDER BY full_path`,
  );
  return r.rows;
}

async function getTags(): Promise<TagOption[]> {
  const r = await poolV002.query<TagOption>(
    `SELECT id::text AS id, name FROM inf_images_tags ORDER BY name`,
  );
  return r.rows;
}

export default async function InfImagesListPage() {
  const [rows, folders, tags, bubbleDistributions, statuses, initialParams] =
    await Promise.all([
      getCachedRows(),
      getFolders(),
      getTags(),
      getInfImagesBubbleDistributions() as unknown as Promise<PillOption[]>,
      getInfImageStatuses() as unknown as Promise<PillOption[]>,
      getInitialViewParams(LIST_STORAGE_KEY, LIST_DEFAULT_WIDTHS),
    ]);

  return (
    <PageShell title="INF Images — List" count={rows.length} maxWidth="">
      <Realtime
        tables={[
          "inf_images",
          "inf_images_folder_links",
          "inf_images_tag_links",
          "inf_images_folders",
          "inf_images_tags",
          "inf_images_bubble_distributions",
          "inf_image_statuses",
        ]}
      />
      <Subtitle>One row per image. Group by Folder, Tag, Status, or Bubble Distribution.</Subtitle>
      <ListTable
        rows={rows}
        folders={folders}
        tags={tags}
        bubbleDistributionOptions={bubbleDistributions}
        statusOptions={statuses}
        initialParams={initialParams}
      />
    </PageShell>
  );
}
