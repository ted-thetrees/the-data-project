import type { Metadata } from "next";
import { Outfit, Source_Sans_3, Nunito } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Data Project",
  description: "Project and task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", outfit.variable, sourceSans.variable, nunito.variable)}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
