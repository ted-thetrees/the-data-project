"use client";

import { DataTable, type Column } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { WebLink } from "@/components/web-link";
import { PillSelect, type PillOption } from "@/components/pill";
import { updateTalentOverallRating } from "./actions";

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

export function ArchitectureTable({
  rows,
  ratingOptions,
}: {
  rows: ArchitectureRow[];
  ratingOptions: PillOption[];
}) {
  const columns: Column<ArchitectureRow>[] = [
    { key: "name", header: "Resource", width: 220 },
    {
      key: "overall_rating",
      header: "Overall Rating",
      width: 175,
      render: (row) => (
        <PillSelect
          value={row.overall_rating ?? ""}
          options={ratingOptions}
          onSave={(name) => updateTalentOverallRating(row.id, name)}
        />
      ),
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
