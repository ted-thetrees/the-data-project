"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const shortcuts: Record<string, string> = {
  "1": "/projects",
  "2": "/inbox",
  "3": "/talent",
  "4": "/talent/architecture",
  "5": "/dag-v002",
  "6": "/new-project",
  "7": "/pick-lists",
  "8": "/crime-series",
};

export function NavShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && shortcuts[e.key]) {
        e.preventDefault();
        router.push(shortcuts[e.key]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
