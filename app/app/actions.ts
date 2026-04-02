"use server";

import { revalidatePath } from "next/cache";

const TEABLE_KEY =
  "teable_acctZTOJ2ORTew1qYd7_V+8SS1C06ZxJaFgMujtpIlioRiDIjCBgDa+jwtSzeNE=";
const TABLE_ID = "tblxWdmSHnBdDYjcmKX";

export async function deleteRecord(recordId: string) {
  const res = await fetch(
    `http://127.0.0.1:3030/api/table/${TABLE_ID}/record/${recordId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TEABLE_KEY}` },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete record");
  }

  revalidatePath("/");
}
