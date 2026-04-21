"use client";

import { useState } from "react";
import { migrateRecord } from "./actions";

const TRAY_KEY = "projects-main:tray";

export function useMigrateAction(recordId: string) {
  const [pending, setPending] = useState(false);

  const migrate = async () => {
    if (pending) return;
    setPending(true);
    try {
      const projectId = await migrateRecord(recordId);
      if (projectId && typeof window !== "undefined") {
        let existing: string[] = [];
        try {
          const raw = sessionStorage.getItem(TRAY_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              existing = parsed.filter((v) => typeof v === "string");
            }
          }
        } catch {
          existing = [];
        }
        if (!existing.includes(projectId)) {
          sessionStorage.setItem(
            TRAY_KEY,
            JSON.stringify([...existing, projectId]),
          );
        }
      }
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
