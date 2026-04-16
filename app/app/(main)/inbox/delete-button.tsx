"use client";

import { deleteRecord } from "./actions";
import { useTransition } from "react";

export function DeleteLink({
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
      onClick={() => startTransition(() => deleteRecord(recordId))}
      disabled={isPending}
      className={`${className ?? ""} cursor-pointer disabled:opacity-50`}
    >
      {isPending ? "…" : "Delete"}
    </button>
  );
}
