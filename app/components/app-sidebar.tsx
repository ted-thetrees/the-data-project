"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InboxIcon,
  DiamondIcon,
  HierarchyIcon,
  FolderAddIcon,
  SwatchIcon,
  Building06Icon,
  GridTableIcon,
  Tv01Icon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  href: string;
  icon: typeof Tv01Icon;
}

const navItems: NavItem[] = [
  { title: "Projects", href: "/projects", icon: GridTableIcon },
  { title: "Inbox", href: "/inbox", icon: InboxIcon },
  { title: "Talent", href: "/talent", icon: DiamondIcon },
  { title: "Architecture", href: "/talent/architecture", icon: Building06Icon },
  { title: "DAG", href: "/dag-v002", icon: HierarchyIcon },
  { title: "New Project", href: "/new-project", icon: FolderAddIcon },
  { title: "Pick Lists", href: "/pick-lists", icon: SwatchIcon },
  { title: "Series", href: "/crime-series", icon: Tv01Icon },
  { title: "Series | Sort", href: "/crime-series/sort", icon: Tv01Icon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLUListElement>(null);

  // Size the sidebar to the widest menu item by measuring the rendered menu
  // at its natural (max-content) width and writing it to --sidebar-width on
  // the sidebar-wrapper ancestor. Runs before paint to avoid a flash.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const prev = el.style.width;
    el.style.width = "max-content";
    const natural = el.offsetWidth;
    el.style.width = prev;
    const wrapper = el.closest(
      '[data-slot="sidebar-wrapper"]'
    ) as HTMLElement | null;
    if (wrapper) {
      wrapper.style.setProperty("--sidebar-width", `${natural}px`);
    }
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <span className="text-sm font-semibold tracking-tight truncate group-data-[collapsible=icon]:hidden">
          The Data Project
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu ref={menuRef}>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <HugeiconsIcon icon={item.icon} size={18} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
