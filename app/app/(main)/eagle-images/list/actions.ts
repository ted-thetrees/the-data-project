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
