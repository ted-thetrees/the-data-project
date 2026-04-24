"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateBubbleDistribution(
  imageId: string,
  bubbleDistributionId: string,
) {
  // PillSelect passes "" for clear; treat as null.
  const value =
    bubbleDistributionId && bubbleDistributionId.length > 0
      ? Number(bubbleDistributionId)
      : null;
  await poolV002.query(
    `UPDATE inf_images SET bubble_distribution_id = $1, updated_at = now() WHERE id = $2`,
    [value, imageId],
  );
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
}

export async function updateImageName(imageId: string, name: string) {
  await poolV002.query(
    `UPDATE inf_images SET name = $1, updated_at = now() WHERE id = $2`,
    [name, imageId],
  );
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
}

/**
 * Bulk-set Bubble Distribution on many images at once.
 */
export async function bulkSetBubbleDistribution(
  imageIds: string[],
  bubbleDistributionId: string,
) {
  if (imageIds.length === 0) return;
  const value =
    bubbleDistributionId && bubbleDistributionId.length > 0
      ? Number(bubbleDistributionId)
      : null;
  await poolV002.query(
    `UPDATE inf_images SET bubble_distribution_id = $1, updated_at = now()
     WHERE id = ANY($2::uuid[])`,
    [value, imageIds],
  );
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
}

/**
 * Bulk-set folder membership status on many images at once.
 */
export async function bulkSetImageFolderStatus(
  imageIds: string[],
  folderId: string,
  statusId: string,
) {
  if (imageIds.length === 0) return;
  const statusIdNum = Number(statusId);
  const sortRow = await poolV002.query<{ id: number }>(
    `SELECT id FROM inf_images_bubble_distributions WHERE name = 'Sort' LIMIT 1`,
  );
  const sortId = sortRow.rows[0]?.id;
  if (sortId !== undefined && statusIdNum === sortId) {
    await poolV002.query(
      `DELETE FROM inf_images_folder_links WHERE folder_id = $1 AND image_id = ANY($2::uuid[])`,
      [folderId, imageIds],
    );
  } else {
    // Build a multi-row INSERT ... ON CONFLICT
    const values = imageIds.map((_, i) => `($${i + 3}::uuid, $1, $2)`).join(",");
    await poolV002.query(
      `INSERT INTO inf_images_folder_links (image_id, folder_id, status_id)
       VALUES ${values}
       ON CONFLICT (image_id, folder_id) DO UPDATE SET status_id = EXCLUDED.status_id`,
      [folderId, statusIdNum, ...imageIds],
    );
  }
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
}

/**
 * Set the image's membership status in a specific folder.
 *   statusId = Yes   → upsert a row with status=Yes
 *   statusId = No    → upsert a row with status=No
 *   statusId = Sort  → delete any existing row (absence-of-row = Sort)
 */
export async function setImageFolderStatus(
  imageId: string,
  folderId: string,
  statusId: string,
) {
  const statusIdNum = Number(statusId);
  const sortRow = await poolV002.query<{ id: number }>(
    `SELECT id FROM inf_images_bubble_distributions WHERE name = 'Sort' LIMIT 1`,
  );
  const sortId = sortRow.rows[0]?.id;
  if (sortId !== undefined && statusIdNum === sortId) {
    await poolV002.query(
      `DELETE FROM inf_images_folder_links WHERE image_id = $1 AND folder_id = $2`,
      [imageId, folderId],
    );
  } else {
    await poolV002.query(
      `INSERT INTO inf_images_folder_links (image_id, folder_id, status_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (image_id, folder_id) DO UPDATE SET status_id = EXCLUDED.status_id`,
      [imageId, folderId, statusIdNum],
    );
  }
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
}

export async function deleteImageFromList(imageId: string) {
  await poolV002.query(`DELETE FROM inf_images WHERE id = $1`, [imageId]);
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
  revalidatePath("/inf-images/masonry");
}

export async function bulkDeleteImages(imageIds: string[]) {
  if (imageIds.length === 0) return;
  await poolV002.query(
    `DELETE FROM inf_images WHERE id = ANY($1::uuid[])`,
    [imageIds],
  );
  revalidatePath("/inf-images/list");
  revalidatePath("/inf-images");
  revalidatePath("/inf-images/masonry");
}
