export const dynamic = "force-dynamic";
export const metadata = { title: "People v003" };

import { getTableData, getPicklistColors, syncPicklistColors, type TeableFieldSchema } from "@/lib/db";
import { PeopleTable } from "./people-table";

export interface PicklistColorMap {
  [fieldKey: string]: { [optionValue: string]: string };
}

const PEOPLE_TABLE_ID = "tblyvrNXdqftQGNIniT";

export default async function PeopleV3Page() {
  const { rows, schema } = await getTableData(PEOPLE_TABLE_ID, "People");

  // Build field label map from schema for picklist color sync
  const fieldLabelMap: Record<string, string> = {};
  for (const field of schema) {
    if (field.type === "singleSelect") {
      fieldLabelMap[field.name] = field.name;
    }
  }

  await syncPicklistColors("People", PEOPLE_TABLE_ID, fieldLabelMap);

  const colorRows = await getPicklistColors("People");
  const picklistColors: PicklistColorMap = {};
  for (const row of colorRows) {
    if (!picklistColors[row.field]) picklistColors[row.field] = {};
    picklistColors[row.field][row.option] = row.color;
  }

  return <PeopleTable data={rows} schema={schema} picklistColors={picklistColors} />;
}
