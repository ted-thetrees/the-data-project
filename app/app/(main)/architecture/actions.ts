"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createArchitect() {
  await poolV002.query(
    `INSERT INTO talent (name, primary_talent_category, primary_talent)
     VALUES ('Untitled', 'Places', 'Architecture')`,
  );
  revalidatePath("/architecture");
  revalidatePath("/talent");
}
