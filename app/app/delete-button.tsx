"use client";

import { deleteRecord } from "./actions";
import { useTransition } from "react";

export function DeleteButton({ recordId }: { recordId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteRecord(recordId))}
      disabled={isPending}
      className="text-xs px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-500 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}
