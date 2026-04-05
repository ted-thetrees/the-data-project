export const dynamic = "force-dynamic";
export const metadata = { title: "Picklist Colors" };

import { getPicklistColors } from "@/lib/db";
import { PicklistColorsTable } from "./picklist-colors-table";
import "../projects-v5/theme.css";

export interface PicklistColorRow {
  id: string;
  table_name: string;
  field: string;
  option: string;
  color: string;
}

export default async function PicklistColorsPage() {
  const rows = (await getPicklistColors()) as PicklistColorRow[];
  return <PicklistColorsTable data={rows} />;
}
