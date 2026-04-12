"use client";

import { useTransition } from "react";
import { migrateRecord } from "./actions";

export function MigrateButton({ recordId }: { recordId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => migrateRecord(recordId))}
      disabled={isPending}
      className="text-xs px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-500 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
    >
      {isPending ? "..." : "Migrate"}
    </button>
  );
}
