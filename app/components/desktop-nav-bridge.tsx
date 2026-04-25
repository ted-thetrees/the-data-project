"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type IpcRendererLike = {
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  removeListener: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
};

export function DesktopNavBridge() {
  const router = useRouter();

  useEffect(() => {
    const ipc = (window as unknown as { electron?: { ipcRenderer?: IpcRendererLike } }).electron
      ?.ipcRenderer;
    if (!ipc) return;

    const handler = (_event: unknown, ...args: unknown[]) => {
      const path = args[0];
      if (typeof path !== "string") return;
      router.prefetch(path);
      router.push(path);
    };

    ipc.on("app:navigate", handler);
    return () => ipc.removeListener("app:navigate", handler);
  }, [router]);

  return null;
}
