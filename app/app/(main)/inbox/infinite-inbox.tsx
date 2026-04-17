"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MasonryGrid } from "./masonry-grid";
import { InboxCard } from "./inbox-list";
import type { CardData } from "./card-data";

const PAGE_SIZE = 50;

type Loader = (offset: number, limit: number) => Promise<CardData[]>;

export function InfiniteInbox({
  initial,
  loader,
  emptyLabel = "End of inbox",
}: {
  initial: CardData[];
  loader: Loader;
  emptyLabel?: string;
}) {
  const [cards, setCards] = useState<CardData[]>(initial);
  const [done, setDone] = useState(initial.length < PAGE_SIZE);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set(initial.map((c) => c.id)));
  const loadingRef = useRef(false);

  useEffect(() => {
    if (done) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loadingRef.current || done) return;
        loadingRef.current = true;
        startTransition(async () => {
          try {
            const next = await loader(cards.length, PAGE_SIZE);
            const fresh = next.filter((c) => !seenIds.current.has(c.id));
            for (const c of fresh) seenIds.current.add(c.id);
            setCards((prev) => [...prev, ...fresh]);
            if (next.length < PAGE_SIZE) setDone(true);
          } finally {
            loadingRef.current = false;
          }
        });
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [cards.length, done]);

  const items = useMemo(
    () => cards.map((card) => ({ id: card.id, element: <InboxCard card={card} /> })),
    [cards],
  );

  return (
    <>
      <MasonryGrid items={items} />
      {!done && (
        <div
          ref={sentinelRef}
          className="py-6 text-center text-[13px] text-[color:var(--muted-foreground)]"
          aria-live="polite"
        >
          {pending ? "Loading more…" : "…"}
        </div>
      )}
      {done && cards.length > 0 && (
        <div className="py-6 text-center text-[13px] text-[color:var(--muted-foreground)]">
          {emptyLabel} · {cards.length} items
        </div>
      )}
    </>
  );
}
