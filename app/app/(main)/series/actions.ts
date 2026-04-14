"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/series");
  revalidatePath("/series-sort");
}

export async function updateCrimeSeriesStatus(
  seriesId: string,
  statusId: string,
) {
  await poolV002.query(
    `UPDATE crime_series SET status_id = $1 WHERE id = $2`,
    [statusId, seriesId],
  );
  revalidate();
}

export async function updateCrimeSeriesTitle(
  seriesId: string,
  title: string,
) {
  await poolV002.query(
    `UPDATE crime_series SET title = $1 WHERE id = $2`,
    [title || "Untitled", seriesId],
  );
  revalidate();
}

export async function createCrimeSeries(statusId: string | null) {
  await poolV002.query(
    `INSERT INTO crime_series (title, status_id) VALUES ('Untitled', $1)`,
    [statusId],
  );
  revalidate();
}
