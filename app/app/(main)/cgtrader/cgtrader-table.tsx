"use client";

import { useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { setCgtraderRating } from "./actions";

export interface CgtraderRow {
  id: string;
  url: string;
  image_url: string | null;
  rating: number | null;
}

const STAR_FULL = "★";
const STAR_EMPTY = "☆";

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void | Promise<void>;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const display = hover ?? value ?? 0;

  const click = (n: number) => {
    const next = value === n ? null : n;
    startTransition(() => onChange(next));
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 select-none"
      onMouseLeave={() => setHover(null)}
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display;
        return (
          <button
            key={n}
            type="button"
            onClick={() => click(n)}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] rounded-sm"
            style={{
              fontSize: "20px",
              width: 22,
              height: 22,
              color: filled ? "var(--primary)" : "var(--muted-foreground)",
              opacity: filled ? 1 : 0.5,
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            title={value === n ? "Click to clear" : `Set rating to ${n}`}
          >
            {filled ? STAR_FULL : STAR_EMPTY}
          </button>
        );
      })}
    </div>
  );
}

function ImageCell({ row }: { row: CgtraderRow }) {
  if (!row.image_url) return <Empty />;
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] rounded-[var(--radius-sm)]"
      title={row.url}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={row.image_url}
        alt=""
        loading="lazy"
        className="rounded-[var(--radius-sm)] object-cover"
        style={{
          width: 160,
          height: 120,
          background: "var(--muted)",
        }}
      />
    </a>
  );
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? u.pathname;
    return slug.replace(/-/g, " ");
  } catch {
    return url;
  }
}

function LinkCell({ row }: { row: CgtraderRow }) {
  return (
    <a
      href={row.url}
      target="_blank"
      rel="noopener noreferrer"
      className="themed-link"
      title={row.url}
    >
      {shortUrl(row.url)}
    </a>
  );
}

export function CgtraderTable({ rows }: { rows: CgtraderRow[] }) {
  const columns: Column<CgtraderRow>[] = [
    {
      key: "image",
      header: "Image",
      width: 184,
      render: (row) => <ImageCell row={row} />,
    },
    {
      key: "link",
      header: "Link",
      width: 480,
      render: (row) => <LinkCell row={row} />,
    },
    {
      key: "rating",
      header: "Rating",
      width: 160,
      render: (row) => (
        <StarRating
          value={row.rating}
          onChange={(next) => setCgtraderRating(row.id, next)}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      fixedLayout
      storageKey="cgtrader"
    />
  );
}
