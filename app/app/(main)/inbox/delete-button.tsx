"use client";

import { deleteRecord } from "./actions";
import { useTransition } from "react";

export function DeleteButton({ recordId }: { recordId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteRecord(recordId))}
      disabled={isPending}
      className="themed-button-sm ghost-danger"
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}
