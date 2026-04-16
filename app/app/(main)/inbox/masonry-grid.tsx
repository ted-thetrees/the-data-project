"use client";

import { useEffect, useState, type ReactNode } from "react";

type Item = { id: string; element: ReactNode };

function pickCols(width: number): number {
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
}

export function MasonryGrid({ items }: { items: Item[] }) {
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const update = () => setCols(pickCols(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns = Array.from({ length: cols }, (_, c) =>
    items.filter((_, i) => i % cols === c)
  );

  return (
    <div className="flex items-start gap-[20px]">
      {columns.map((col, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-[10px]">
          {col.map((item) => (
            <div key={item.id}>{item.element}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
