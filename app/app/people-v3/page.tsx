export const dynamic = "force-dynamic";
export const metadata = { title: "People v003" };

import { getPeople, getPicklistColors, getTeableFieldOptions } from "@/lib/db";
import { PeopleTable } from "./people-table";
import "../projects-v5/theme.css";

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
  target_desirability: string | null;
  teller_status: string | null;
}

export interface PicklistColorMap {
  [fieldKey: string]: { [optionValue: string]: string };
}

export default async function PeopleV3Page() {
  const [people, colorRows, fieldOptions] = await Promise.all([
    getPeople(),
    getPicklistColors("People"),
    getTeableFieldOptions("tblyvrNXdqftQGNIniT"),
  ]);

  // Build a nested map: field → option → hex color
  const picklistColors: PicklistColorMap = {};
  for (const row of colorRows) {
    if (!picklistColors[row.field]) picklistColors[row.field] = {};
    picklistColors[row.field][row.option] = row.color;
  }

  return <PeopleTable data={people as PersonRow[]} picklistColors={picklistColors} fieldOptions={fieldOptions} />;
}
