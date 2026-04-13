"use client";

import { DataTable, type Column } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { Pill } from "@/components/pill";

export interface ArchitectureRow {
  id: string;
  name: string;
  overall_rating: string | null;
  rating_color: string | null;
  website: string | null;
  instagram: string | null;
  areas: string | null;
  notes: string | null;
}

function AreaTags({ areas }: { areas: string | null }) {
  if (!areas) return <Empty />;
  return (
    <div className="flex gap-1 flex-wrap">
      {areas.split(", ").map((area) => (
        <span
          key={area}
          className="inline-block px-1.5 py-0.5 rounded"
          style={{
            fontSize: "var(--font-size-xs)",
            backgroundColor: "var(--tag-bg)",
            color: "var(--tag-text)",
          }}
        >
          {area}
        </span>
      ))}
    </div>
  );
}

const columns: Column<ArchitectureRow>[] = [
  { key: "name", header: "Resource", width: 220 },
  {
    key: "overall_rating",
    header: "Overall Rating",
    width: 175,
    render: (row) => {
      if (!row.overall_rating) return <Empty />;
      return <Pill color={row.rating_color}>{row.overall_rating}</Pill>;
    },
  },
  {
    key: "website",
    header: "Website",
    width: 200,
    render: (row) => <WebLink url={row.website} />,
  },
  {
    key: "instagram",
    header: "Instagram",
    width: 180,
    render: (row) => <WebLink url={row.instagram} />,
  },
  {
    key: "areas",
    header: "Areas",
    width: 160,
    render: (row) => <AreaTags areas={row.areas} />,
  },
  {
    key: "notes",
    header: "Notes",
    width: 200,
    render: (row) =>
      row.notes ? (
        <span className="truncate block text-muted-foreground" title={row.notes}>
          {row.notes}
        </span>
      ) : (
        <Empty />
      ),
  },
];

export function ArchitectureTable({ rows }: { rows: ArchitectureRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      fixedLayout
      storageKey="architecture"
    />
  );
}
