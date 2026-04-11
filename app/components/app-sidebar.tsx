"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  href: string;
  icon: typeof Tv01Icon;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  { title: "Projects", href: "/projects", icon: GridTableIcon },
  { title: "Inbox", href: "/inbox", icon: InboxIcon },
  { title: "Talent", href: "/talent", icon: DiamondIcon },
  { title: "Architecture", href: "/talent/architecture", icon: Building06Icon },
  { title: "DAG", href: "/dag-v002", icon: HierarchyIcon },
  { title: "New Project", href: "/new-project", icon: FolderAddIcon },
  { title: "Pick Lists", href: "/pick-lists", icon: SwatchIcon },
  {
    title: "Crime Series",
    href: "/crime-series",
    icon: Tv01Icon,
    children: [
      { title: "Sort", href: "/crime-series/sort" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

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
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.children
                      ? `${item.title}: ${item.children.map((c) => c.title).join(", ")}`
                      : item.title}
                  >
                    <div className="relative">
                      <HugeiconsIcon icon={item.icon} size={18} />
                      {item.children && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-sidebar-foreground/40" />
                      )}
                    </div>
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            render={<Link href={child.href} />}
                            isActive={pathname === child.href}
                          >
                            <span>{child.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
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
