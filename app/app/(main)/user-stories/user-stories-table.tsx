"use client";

import { DataTable, type Column } from "@/components/data-table";
import { Tag } from "@/components/tag";
import { Empty } from "@/components/empty";

export interface UserStoryRow {
  id: string;
  title: string | null;
  narrative: string | null;
  roles: string[];
  category: string | null;
}

export function UserStoriesTable({ rows }: { rows: UserStoryRow[] }) {
  const columns: Column<UserStoryRow>[] = [
    {
      key: "as",
      header: "as",
      width: 260,
      render: (row) => {
        if (!row.roles || row.roles.length === 0) return <Empty />;
        return (
          <div className="flex flex-wrap gap-1">
            {row.roles.map((role) => (
              <Tag key={role}>{role}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      key: "narrative",
      header: "narrative",
      width: 560,
      render: (row) => {
        if (!row.narrative) return <Empty />;
        return <span>{row.narrative}</span>;
      },
    },
    {
      key: "title",
      header: "title",
      width: 240,
      render: (row) => {
        if (!row.title) return <Empty />;
        return <span>{row.title}</span>;
      },
    },
    {
      key: "category",
      header: "category",
      width: 180,
      render: (row) => {
        if (!row.category) return <Empty />;
        return <Tag>{row.category}</Tag>;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      fixedLayout
      storageKey="user-stories"
    />
  );
}
