"use client";

import { useTransition } from "react";
import { migrateRecord } from "./actions";

export function MigrateLink({
  recordId,
  className,
}: {
  recordId: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => migrateRecord(recordId))}
      disabled={isPending}
      className={`${className ?? ""} cursor-pointer disabled:opacity-50`}
    >
      {isPending ? "…" : "Projects"}
    </button>
  );
}
