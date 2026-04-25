"use client";

import { useState } from "react";
import { migrateRecord } from "./actions";

export function useMigrateAction(recordId: string) {
  const [pending, setPending] = useState(false);

  const migrate = async () => {
    if (pending) return;
    setPending(true);
    try {
      await migrateRecord(recordId);
    } finally {
      setPending(false);
    }
  };

  return { migrate, pending };
}

export function MigrateLink({
  recordId,
  className,
}: {
  recordId: string;
  className?: string;
}) {
  const { migrate, pending } = useMigrateAction(recordId);

  return (
    <button
      type="button"
      onClick={migrate}
      disabled={pending}
      className={`${className ?? ""} cursor-pointer disabled:opacity-50`}
    >
      {pending ? "…" : "Projects"}
    </button>
  );
}
