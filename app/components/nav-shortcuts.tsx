"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const shortcuts: Record<string, string> = {
  "1": "/projects-main",
  "2": "/inbox",
  "3": "/talent",
  "5": "/dag",
  "6": "/new-project",
  "7": "/pick-lists",
  "8": "/series",
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
