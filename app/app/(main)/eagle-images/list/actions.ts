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
    `UPDATE eagle_images SET bubble_distribution_id = $1, updated_at = now() WHERE id = $2`,
    [value, imageId],
  );
  revalidatePath("/eagle-images/list");
  revalidatePath("/eagle-images");
}

export async function updateImageName(imageId: string, name: string) {
  await poolV002.query(
    `UPDATE eagle_images SET name = $1, updated_at = now() WHERE id = $2`,
    [name, imageId],
  );
  revalidatePath("/eagle-images/list");
  revalidatePath("/eagle-images");
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
    `SELECT id FROM eagle_bubble_distributions WHERE name = 'Sort' LIMIT 1`,
  );
  const sortId = sortRow.rows[0]?.id;
  if (sortId !== undefined && statusIdNum === sortId) {
    await poolV002.query(
      `DELETE FROM eagle_image_folders WHERE image_id = $1 AND folder_id = $2`,
      [imageId, folderId],
    );
  } else {
    await poolV002.query(
      `INSERT INTO eagle_image_folders (image_id, folder_id, status_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (image_id, folder_id) DO UPDATE SET status_id = EXCLUDED.status_id`,
      [imageId, folderId, statusIdNum],
    );
  }
  revalidatePath("/eagle-images/list");
  revalidatePath("/eagle-images");
}

export async function deleteImageFromList(imageId: string) {
  await poolV002.query(`DELETE FROM eagle_images WHERE id = $1`, [imageId]);
  revalidatePath("/eagle-images/list");
  revalidatePath("/eagle-images");
  revalidatePath("/eagle-images/masonry");
}
