import type { Metadata } from "next";
import { headers } from "next/headers";
import { Outfit, Source_Sans_3, Nunito } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { NavShortcuts } from "@/components/nav-shortcuts";
import { RadialMenu } from "@/components/radial-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { readAllTableViewCookies } from "@/lib/table-views-cookie";
import { GridPageShortcuts } from "@/components/grid-page-shortcuts";

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
  title: {
    default: "The Data Project",
    template: "%s",
  },
  description: "Project and task management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isDesktopShell = userAgent.includes("DataDesktop/");
  const tableViews = await readAllTableViewCookies();
  const tableViewsJson = JSON.stringify(tableViews).replace(/</g, "\\u003c");

  return (
    <html lang="en" className={cn("h-full", "antialiased", outfit.variable, sourceSans.variable, nunito.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__TV=${tableViewsJson};`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {!isDesktopShell && <NavShortcuts />}
          <RadialMenu />
          <GridPageShortcuts />
          <main className="flex-1">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
