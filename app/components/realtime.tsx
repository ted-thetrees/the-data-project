"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface RealtimeProps {
  tables: string[];
  channelPrefix?: string;
}

export function Realtime({ tables, channelPrefix = "realtime" }: RealtimeProps) {
  const router = useRouter();
  const instanceId = useId();
  const key = tables.join(",");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const suffix = Math.random().toString(36).slice(2, 8);
    const channels = tables.map((table) =>
      supabase
        .channel(`${channelPrefix}-${table}-${instanceId}-${suffix}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => router.refresh()
        )
        .subscribe()
    );
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, key, channelPrefix, instanceId]);

  return null;
}
