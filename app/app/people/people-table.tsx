"use client";

import { GroupableTable } from "@/components/groupable-table";
import type { ColumnDef, GroupableField } from "@/components/groupable-table";
import { updatePersonField } from "./actions";
import "../../app/projects-v5/theme.css";

const columns: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", width: 200, fontWeight: 500 },
  { key: "image", label: "Photo", type: "image", width: 50 },
  { key: "familiarity", label: "Familiarity", type: "select", width: 160, options: [
    "1 Very Close + Family", "2 Know | Current", "3 Know | In Past",
    "4 Acquainted | Talked To", "5 Contacted | No Response",
    "6 Contacted | Would not Remember Me", "7 Never Met",
  ]},
  { key: "gender", label: "Gender", type: "select", width: 80, options: ["Man", "Woman"] },
  { key: "known_as", label: "Known As", type: "text", width: 140 },
  { key: "metro_area", label: "Metro Area", type: "text", width: 180 },
  { key: "has_org_filled", label: "Org Filled", type: "select", width: 120, options: ["Yes", "Maybe", "No", "Sort"] },
  { key: "target_desirability", label: "Desirability", type: "select", width: 140, options: ["F Yes", "Possible", "Not Sure / Ponder Later", "No"] },
  { key: "teller_status", label: "Teller Status", type: "select", width: 180, options: [
    "Can Ask When Website Is Up", "When I Have a Kite", "Chit Used",
    "Done/Recorded!", "Sort", "Do not Want to Ask", "Will Resist/Never Do It",
  ]},
];

const groupableFields: GroupableField[] = [
  { key: "familiarity", label: "Familiarity" },
  { key: "gender", label: "Gender" },
  { key: "metro_area", label: "Metro Area" },
  { key: "has_org_filled", label: "Org Filled" },
  { key: "target_desirability", label: "Desirability" },
  { key: "teller_status", label: "Teller Status" },
];

export function PeopleTable({ people }: { people: any[] }) {
  return (
    <GroupableTable
      title="People"
      data={people}
      columns={columns}
      groupableFields={groupableFields}
      searchFields={["name", "known_as", "metro_area"]}
      onUpdate={(recordId, field, value) => updatePersonField(recordId, field, value)}
    />
  );
}
