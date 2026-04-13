"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateCrimeSeriesStatus(
  seriesId: string,
  statusId: string,
) {
  await poolV002.query(
    `UPDATE crime_series SET status_id = $1 WHERE id = $2`,
    [statusId, seriesId],
  );
  revalidatePath("/series");
  revalidatePath("/series-sort");
}
