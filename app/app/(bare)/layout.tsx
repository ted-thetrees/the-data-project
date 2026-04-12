import type { Metadata } from "next";
import "./bare.css";

export const metadata: Metadata = {
  title: "Grid",
};

export default function BareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
