"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

const PATH = "/eagle-images";

export async function createNote(imageId: string, note = "") {
  // Insert at the top of the image's note group (smallest sort_order).
  await poolV002.query(
    `INSERT INTO eagle_image_notes (image_id, note, sort_order)
     VALUES ($1, $2, COALESCE((SELECT MIN(sort_order) FROM eagle_image_notes WHERE image_id = $1), 1) - 1)`,
    [imageId, note],
  );
  revalidatePath(PATH);
}

export async function updateNote(noteId: string, note: string) {
  await poolV002.query(
    `UPDATE eagle_image_notes SET note = $1, updated_at = now() WHERE id = $2`,
    [note, noteId],
  );
  revalidatePath(PATH);
}

/**
 * Promote a "synthetic empty" row into a real note. Used when the user edits
 * the placeholder cell on an image that has no notes yet.
 */
export async function upsertNoteForImage(imageId: string, note: string) {
  await poolV002.query(
    `INSERT INTO eagle_image_notes (image_id, note, sort_order) VALUES ($1, $2, 0)`,
    [imageId, note],
  );
  revalidatePath(PATH);
}

export async function deleteNote(noteId: string) {
  await poolV002.query(`DELETE FROM eagle_image_notes WHERE id = $1`, [noteId]);
  revalidatePath(PATH);
}

export async function updateBubbleDistribution(
  imageId: string,
  bubbleDistributionId: string,
) {
  const value =
    bubbleDistributionId && bubbleDistributionId.length > 0
      ? Number(bubbleDistributionId)
      : null;
  await poolV002.query(
    `UPDATE eagle_images SET bubble_distribution_id = $1, updated_at = now() WHERE id = $2`,
    [value, imageId],
  );
  revalidatePath(PATH);
  revalidatePath("/eagle-images/list");
}

export async function deleteImage(imageId: string) {
  // Cascades to notes + tag/folder links; Storage object is left in the bucket.
  await poolV002.query(`DELETE FROM eagle_images WHERE id = $1`, [imageId]);
  revalidatePath(PATH);
}
