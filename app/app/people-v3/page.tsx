export const dynamic = "force-dynamic";
export const metadata = { title: "People v003" };

import { getPeople, getPicklistColors, getTeableFieldOptions, syncPicklistColors } from "@/lib/db";
import { PeopleTable } from "./people-table";

export interface PersonRow {
  id: string;
  name: string;
  image: string | null;
  familiarity: string | null;
  gender: string | null;
  known_as: string | null;
  metro_area: string | null;
  created_date: string | null;
  has_org_filled: string | null;
  teller_status: string | null;
}

export interface PicklistColorMap {
  [fieldKey: string]: { [optionValue: string]: string };
}

// Maps Teable field names to display labels used in Picklist_Colors
const FIELD_LABEL_MAP: Record<string, string> = {
  "Familiarity": "Familiarity",
  "Gender": "Gender",
  "Has Org Filled": "Org Filled",
  "Teller Status": "Teller Status",
};

const PEOPLE_TABLE_ID = "tblyvrNXdqftQGNIniT";

export default async function PeopleV3Page() {
  // Sync missing picklist colors first (creates mappings for new options)
  await syncPicklistColors("People", PEOPLE_TABLE_ID, FIELD_LABEL_MAP);

  const [people, colorRows, fieldOptions] = await Promise.all([
    getPeople(),
    getPicklistColors("People"),
    getTeableFieldOptions(PEOPLE_TABLE_ID),
  ]);

  // Build a nested map: field → option → hex color
  const picklistColors: PicklistColorMap = {};
  for (const row of colorRows) {
    if (!picklistColors[row.field]) picklistColors[row.field] = {};
    picklistColors[row.field][row.option] = row.color;
  }

  return <PeopleTable data={people as PersonRow[]} picklistColors={picklistColors} fieldOptions={fieldOptions} />;
}
