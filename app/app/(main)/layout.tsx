import type { Metadata } from "next";
import { headers } from "next/headers";
import { Outfit, Source_Sans_3, Nunito } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NavShortcuts } from "@/components/nav-shortcuts";
import { RadialMenu } from "@/components/radial-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

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

  return (
    <html lang="en" className={cn("h-full", "antialiased", outfit.variable, sourceSans.variable, nunito.variable)}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <SidebarProvider defaultOpen={false}>
            {!isDesktopShell && <AppSidebar />}
            {!isDesktopShell && <NavShortcuts />}
            {isDesktopShell && <RadialMenu />}
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
