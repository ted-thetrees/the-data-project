"use client";

import { useMemo, useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { setCgtraderRating } from "./actions";

type SortDir = "desc" | "asc" | null;

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
          width: 400,
          height: 300,
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

function nextSortDir(current: SortDir): SortDir {
  if (current === "desc") return "asc";
  if (current === "asc") return null;
  return "desc";
}

function RatingHeader({
  dir,
  onClick,
}: {
  dir: SortDir;
  onClick: () => void;
}) {
  const arrow = dir === "desc" ? "▾" : dir === "asc" ? "▴" : "⇅";
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] rounded-sm"
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        font: "inherit",
        color: "inherit",
        letterSpacing: "inherit",
      }}
      title={
        dir === "desc"
          ? "Sorted high → low (click for low → high)"
          : dir === "asc"
            ? "Sorted low → high (click to clear sort)"
            : "Click to sort by rating"
      }
    >
      Rating <span style={{ opacity: dir ? 1 : 0.4 }}>{arrow}</span>
    </button>
  );
}

export function CgtraderTable({ rows }: { rows: CgtraderRow[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedRows = useMemo(() => {
    if (!sortDir) return rows;
    const sign = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a.rating;
      const bv = b.rating;
      if (av != null && bv != null && av !== bv) return (av - bv) * sign;
      if (av == null && bv != null) return 1;
      if (bv == null && av != null) return -1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }, [rows, sortDir]);

  const columns: Column<CgtraderRow>[] = [
    {
      key: "image",
      header: "Image",
      width: 460,
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
      header: (
        <RatingHeader
          dir={sortDir}
          onClick={() => setSortDir((d) => nextSortDir(d))}
        />
      ),
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
      rows={sortedRows}
      rowKey={(r) => r.id}
      fixedLayout
      storageKey="cgtrader"
      rowStyle={(row) =>
        row.rating != null
          ? ({ "--cell-bg": "#e6f2ff" } as React.CSSProperties)
          : undefined
      }
    />
  );
}
