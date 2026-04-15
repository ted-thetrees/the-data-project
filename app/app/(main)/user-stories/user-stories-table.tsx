"use client";

import { DataTable, type Column } from "@/components/data-table";
import { Pill } from "@/components/pill";
import { Empty } from "@/components/empty";

export interface UserStoryRow {
  id: string;
  title: string | null;
  narrative: string | null;
  roles: string[];
  category: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  "the founder": "#c96442",
  "an invitee": "#e6a87c",
  "a storyteller": "#7a8b5c",
  "a subscriber": "#6b8ca3",
  "a public listener": "#a890a8",
  "a story subject": "#c9a875",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Basic human need": "#8a8680",
};

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
              <Pill key={role} color={ROLE_COLORS[role]}>
                {role}
              </Pill>
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
        return <Pill color={CATEGORY_COLORS[row.category]}>{row.category}</Pill>;
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
