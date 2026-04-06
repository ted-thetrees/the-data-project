"use client";

import { useMemo } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Cell,
} from "material-react-table";
import { updatePersonField } from "../../people/actions";

interface Person {
  id: string;
  name: string | null;
  image: string | null;
  familiarity: string | null;
  gender: string | null;
  known_as: string | null;
  metro_area: string | null;
  has_org_filled: string | null;
  target_desirability: string | null;
  teller_status: string | null;
  created_date: string | null;
}

const FAMILIARITY_OPTIONS = [
  "1 Very Close + Family",
  "2 Know | Current",
  "3 Know | In Past",
  "4 Acquainted | Talked To",
  "5 Contacted | No Response",
  "6 Contacted | Would not Remember Me",
  "7 Never Met",
];

const GENDER_OPTIONS = ["Man", "Woman"];

const ORG_FILLED_OPTIONS = ["Yes", "Maybe", "No", "Sort"];

const DESIRABILITY_OPTIONS = [
  "F Yes",
  "Possible",
  "Not Sure / Ponder Later",
  "No",
];

const TELLER_STATUS_OPTIONS = [
  "Can Ask When Website Is Up",
  "When I Have a Kite",
  "Chit Used",
  "Done/Recorded!",
  "Sort",
  "Do not Want to Ask",
  "Will Resist/Never Do It",
];

// Map from column accessorKey to the field key expected by updatePersonField
const FIELD_KEY_MAP: Record<string, string> = {
  name: "name",
  familiarity: "familiarity",
  gender: "gender",
  known_as: "knownAs",
  metro_area: "metroArea",
  has_org_filled: "hasOrgFilled",
  target_desirability: "targetDesirability",
  teller_status: "tellerStatus",
};

export function PeopleTable({ people }: { people: Person[] }) {
  const columns = useMemo<MRT_ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        size: 200,
        enableGrouping: false,
        muiTableBodyCellProps: { sx: { fontWeight: 500 } },
      },
      {
        accessorKey: "familiarity",
        header: "Familiarity",
        size: 220,
        editVariant: "select",
        editSelectOptions: FAMILIARITY_OPTIONS,
        filterVariant: "select",
        filterSelectOptions: FAMILIARITY_OPTIONS,
      },
      {
        accessorKey: "gender",
        header: "Gender",
        size: 100,
        editVariant: "select",
        editSelectOptions: GENDER_OPTIONS,
        filterVariant: "select",
        filterSelectOptions: GENDER_OPTIONS,
      },
      {
        accessorKey: "known_as",
        header: "Known As",
        size: 150,
        enableGrouping: false,
      },
      {
        accessorKey: "metro_area",
        header: "Metro Area",
        size: 180,
      },
      {
        accessorKey: "has_org_filled",
        header: "Org Filled",
        size: 120,
        editVariant: "select",
        editSelectOptions: ORG_FILLED_OPTIONS,
        filterVariant: "select",
        filterSelectOptions: ORG_FILLED_OPTIONS,
      },
      {
        accessorKey: "target_desirability",
        header: "Desirability",
        size: 160,
        editVariant: "select",
        editSelectOptions: DESIRABILITY_OPTIONS,
        filterVariant: "select",
        filterSelectOptions: DESIRABILITY_OPTIONS,
      },
      {
        accessorKey: "teller_status",
        header: "Teller Status",
        size: 220,
        editVariant: "select",
        editSelectOptions: TELLER_STATUS_OPTIONS,
        filterVariant: "select",
        filterSelectOptions: TELLER_STATUS_OPTIONS,
      },
      {
        accessorKey: "created_date",
        header: "Created",
        size: 160,
        enableEditing: false,
        enableGrouping: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          if (!val) return null;
          return new Date(val).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: people,
    getRowId: (row) => row.id,

    // Editing
    enableEditing: true,
    editDisplayMode: "cell",
    onEditingRowSave: ({ exitEditingMode }) => exitEditingMode(),

    muiEditTextFieldProps: ({ cell }: { cell: MRT_Cell<Person> }) => ({
      onBlur: (event) => {
        const columnId = cell.column.id;
        const fieldKey = FIELD_KEY_MAP[columnId];
        if (!fieldKey) return;
        const newValue = event.target.value;
        const recordId = cell.row.original.id;
        updatePersonField(recordId, fieldKey, newValue);
      },
    }),

    // Grouping
    enableGrouping: true,
    groupedColumnMode: "reorder",

    // Search & filtering
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableFacetedValues: true,

    // Sorting
    enableSorting: true,

    // Column features
    enableColumnOrdering: true,
    enableColumnResizing: true,
    enablePinning: true,

    // Pagination
    enablePagination: false,
    enableBottomToolbar: false,

    // Density
    initialState: {
      density: "compact",
      showColumnFilters: false,
      showGlobalFilter: true,
    },

    // Row count in toolbar
    muiToolbarAlertBannerProps: {
      sx: { display: "none" },
    },
  });

  return (
    <div style={{ padding: "1rem" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}
