"use client";

import { useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function InboxRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("inbox-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inbox" },
        () => startTransition(() => router.refresh()),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
