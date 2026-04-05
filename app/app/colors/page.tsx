export const dynamic = "force-dynamic";
export const metadata = { title: "Colors" };

import { getColors } from "@/lib/db";
import { ColorsTable } from "./colors-table";
import "../projects-v5/theme.css";

export interface ColorRow {
  id: string;
  name: string;
  hex: string;
  palette: string;
  created_date: string | null;
}

export default async function ColorsPage() {
  const colors = (await getColors()) as ColorRow[];
  return <ColorsTable data={colors} />;
}
