"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type GroupingState,
} from "@tanstack/react-table";

interface TalentRow {
  id: string;
  name: string;
  architecture: string | null;
  interiors: string | null;
  landscape: string | null;
  lighting: string | null;
  kitchens: string | null;
  archviz: string | null;
  primary_talent: string | null;
  primary_talent_category: string | null;
  overall_rating: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  areas: string | null;
}

const RATING_ORDER: Record<string, number> = {
  "1 Absolute Top": 1,
  "2 Probably Absolute Top": 2,
  "3 Contenders to (Re)Mull": 3,
  "4 Other": 4,
};

const GROUP_COLORS: Record<string, string> = {
  // Primary Talent Category
  "Places": "hsl(15, 80%, 55%)",
  "Objects & Assets": "hsl(200, 70%, 50%)",
  "Visuals": "hsl(280, 60%, 55%)",
  // Primary Talent
  "Architecture": "hsl(145, 55%, 42%)",
  "Interiors": "hsl(35, 70%, 50%)",
  "Landscape": "hsl(95, 50%, 42%)",
  "Lighting": "hsl(55, 70%, 45%)",
  "ArchViz": "hsl(200, 60%, 50%)",
  "Kitchens": "hsl(340, 55%, 50%)",
  // Overall Rating
  "1 Absolute Top": "hsl(220, 55%, 50%)",
  "2 Probably Absolute Top": "hsl(220, 40%, 60%)",
  "3 Contenders to (Re)Mull": "hsl(220, 30%, 65%)",
  "4 Other": "hsl(220, 20%, 70%)",
};

function YesBadge({ value }: { value: string | null }) {
  if (!value || value === "----" || value === "-----") return <span className="text-zinc-400">—</span>;
  if (value === "Yes") return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Yes</span>;
  return <span className="text-zinc-500 text-sm">{value}</span>;
}

function WebsiteLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-zinc-400">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate block max-w-[200px]"
      title={url}
    >
      {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
    </a>
  );
}

export function TalentTable({ data }: { data: TalentRow[] }) {
  const columns = useMemo<ColumnDef<TalentRow, any>[]>(
    () => [
      {
        accessorKey: "primary_talent_category",
        header: "Category",
        enableGrouping: true,
        cell: ({ getValue }) => getValue() || "—",
      },
      {
        accessorKey: "primary_talent",
        header: "Primary Talent",
        enableGrouping: true,
        cell: ({ getValue }) => getValue() || "—",
      },
      {
        accessorKey: "overall_rating",
        header: "Rating",
        enableGrouping: true,
        sortingFn: (a, b) => {
          const aVal = RATING_ORDER[a.getValue("overall_rating") as string] ?? 99;
          const bVal = RATING_ORDER[b.getValue("overall_rating") as string] ?? 99;
          return aVal - bVal;
        },
        cell: ({ getValue }) => getValue() || "—",
      },
      {
        accessorKey: "name",
        header: "Resource",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "website",
        header: "Website",
        cell: ({ getValue }) => <WebsiteLink url={getValue() as string | null} />,
      },
      {
        accessorKey: "instagram",
        header: "Instagram",
        cell: ({ getValue }) => <WebsiteLink url={getValue() as string | null} />,
      },
      {
        accessorKey: "architecture",
        header: "Arch",
        cell: ({ getValue }) => <YesBadge value={getValue() as string | null} />,
      },
      {
        accessorKey: "interiors",
        header: "Int",
        cell: ({ getValue }) => <YesBadge value={getValue() as string | null} />,
      },
      {
        accessorKey: "landscape",
        header: "Land",
        cell: ({ getValue }) => <YesBadge value={getValue() as string | null} />,
      },
      {
        accessorKey: "lighting",
        header: "Light",
        cell: ({ getValue }) => <YesBadge value={getValue() as string | null} />,
      },
      {
        accessorKey: "kitchens",
        header: "Kit",
        cell: ({ getValue }) => <YesBadge value={getValue() as string | null} />,
      },
      {
        accessorKey: "archviz",
        header: "AViz",
        cell: ({ getValue }) => <YesBadge value={getValue() as string | null} />,
      },
      {
        accessorKey: "areas",
        header: "Areas",
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          if (!val) return <span className="text-zinc-400">—</span>;
          return (
            <div className="flex gap-1 flex-wrap">
              {val.split(", ").map((area) => (
                <span
                  key={area}
                  className="inline-block px-1.5 py-0.5 rounded text-xs bg-zinc-100 text-zinc-700"
                >
                  {area}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          if (!val) return <span className="text-zinc-400">—</span>;
          return <span className="text-sm text-zinc-600 truncate block max-w-[200px]" title={val}>{val}</span>;
        },
      },
    ],
    []
  );

  const grouping: GroupingState = [
    "primary_talent_category",
    "primary_talent",
    "overall_rating",
  ];

  const table = useReactTable({
    data,
    columns,
    state: { grouping, expanded: true },
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableGrouping: true,
  });

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900">Talent</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (grouping.includes(header.column.id)) return null;
                  return (
                    <th
                      key={header.id}
                      className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2 border-b border-zinc-200"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              if (row.getIsGrouped()) {
                const groupValue = row.groupingValue as string;
                const groupColumn = row.groupingColumnId;
                const depth =
                  groupColumn === "primary_talent_category" ? 0 :
                  groupColumn === "primary_talent" ? 1 : 2;

                const color = GROUP_COLORS[groupValue] || "hsl(0, 0%, 50%)";
                const count = row.subRows.length;
                const paddingLeft = depth * 24 + 12;

                return (
                  <tr key={row.id}>
                    <td
                      colSpan={columns.length - grouping.length}
                      className="py-1.5 font-semibold border-b border-zinc-100"
                      style={{ paddingLeft }}
                    >
                      <span
                        className="inline-block px-2.5 py-1 rounded text-white text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {groupValue}
                      </span>
                      <span className="ml-2 text-xs text-zinc-400">{count}</span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={row.id}
                  className="hover:bg-zinc-50 border-b border-zinc-50"
                >
                  {row.getVisibleCells().map((cell) => {
                    if (grouping.includes(cell.column.id)) return null;
                    return (
                      <td key={cell.id} className="px-3 py-2 text-sm">
                        {cell.getIsAggregated()
                          ? null
                          : flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
