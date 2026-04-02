"use client";

import { deleteRecord } from "./actions";
import { useTransition } from "react";

export function DeleteButton({ recordId }: { recordId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteRecord(recordId))}
      disabled={isPending}
      className="text-zinc-400 hover:text-red-500 transition-colors text-sm cursor-pointer disabled:opacity-50"
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}
