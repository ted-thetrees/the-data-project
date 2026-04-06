export const dynamic = "force-dynamic";
export const metadata = { title: "People v003" };

import { getTableData, getPicklistColors, type TeableFieldSchema } from "@/lib/db";
import { PeopleTable } from "./people-table";

export interface PicklistColorMap {
  [fieldKey: string]: { [optionValue: string]: string };
}

export default async function PeopleV3Page() {
  const { rows, schema } = await getTableData("181", "People");

  const colorRows = await getPicklistColors("People");
  const picklistColors: PicklistColorMap = {};
  for (const row of colorRows) {
    if (!picklistColors[row.field]) picklistColors[row.field] = {};
    picklistColors[row.field][row.option] = row.color;
  }

  return <PeopleTable data={rows} schema={schema} picklistColors={picklistColors} />;
}
