"use client";

import { useEffect } from "react";

export function GridThemeScope() {
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-grid-theme", "");
    return () => html.removeAttribute("data-grid-theme");
  }, []);
  return null;
}
