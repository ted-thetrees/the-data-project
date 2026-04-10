"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const shortcuts: Record<string, string> = {
  "1": "/inbox",
  "2": "/talent",
  "3": "/dag-v002",
  "4": "/new-project",
  "5": "/pick-lists",
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
