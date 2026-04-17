"use client";

import { useState, useTransition } from "react";
import { backfillOneInboxPreview } from "./actions";

export function BackfillPreviewsButton({ initialPending }: { initialPending: number }) {
  const [remaining, setRemaining] = useState(initialPending);
  const [processed, setProcessed] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (initialPending === 0 && !running && processed === 0) return null;

  async function runLoop() {
    setRunning(true);
    setError(null);
    try {
      for (;;) {
        const result = await backfillOneInboxPreview();
        if (!result.processed) {
          setRemaining(0);
          break;
        }
        setProcessed((n) => n + 1);
        setRemaining(result.remaining);
        if (result.remaining === 0) break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-[13px]">
      <button
        type="button"
        className="themed-button themed-button-sm"
        disabled={running || pending || remaining === 0}
        onClick={() => startTransition(runLoop)}
      >
        {running ? `Backfilling… (${processed} done, ${remaining} left)` : `Backfill ${remaining} previews`}
      </button>
      {!running && processed > 0 && (
        <span className="text-[color:var(--muted-foreground)]">
          {processed} processed
        </span>
      )}
      {error && <span className="text-[color:var(--destructive)]">{error}</span>}
    </div>
  );
}
