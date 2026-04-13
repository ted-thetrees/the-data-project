"use client";

import { useTransition } from "react";
import { migrateRecord } from "./actions";

export function MigrateButton({ recordId }: { recordId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => migrateRecord(recordId))}
      disabled={isPending}
      className="themed-button-sm ghost-success"
    >
      {isPending ? "..." : "Migrate"}
    </button>
  );
}
