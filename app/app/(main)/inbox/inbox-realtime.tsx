"use client";

import { useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function InboxRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    console.log("[InboxRealtime] mounting, creating channel");
    const channel = supabase
      .channel("inbox-changes-" + Date.now())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inbox" },
        (payload) => {
          console.log("[InboxRealtime] change received", payload.eventType);
          startTransition(() => router.refresh());
        },
      )
      .subscribe((status, err) => {
        console.log("[InboxRealtime] subscribe status:", status, err?.message);
      });

    return () => {
      console.log("[InboxRealtime] unmounting, removing channel");
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
