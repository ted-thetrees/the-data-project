"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface RealtimeProps {
  tables: string[];
  channelPrefix?: string;
}

export function Realtime({ tables, channelPrefix = "realtime" }: RealtimeProps) {
  const router = useRouter();
  const key = tables.join(",");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channels = tables.map((table) =>
      supabase
        .channel(`${channelPrefix}-${table}`)
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
  }, [router, key, channelPrefix]);

  return null;
}
