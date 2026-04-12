"use client";

import Linkify from "linkify-react";

export function LinkifiedText({ text }: { text: string }) {
  return (
    <Linkify
      options={{
        target: "_blank",
        rel: "noopener noreferrer",
        className: "text-primary underline hover:opacity-80",
      }}
    >
      {text}
    </Linkify>
  );
}
