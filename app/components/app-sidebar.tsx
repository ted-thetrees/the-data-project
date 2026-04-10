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

const navItems = [
  { title: "Inbox", href: "/inbox", icon: InboxIcon },
  { title: "Talent", href: "/talent", icon: DiamondIcon },
  { title: "Architecture", href: "/talent/architecture", icon: Building06Icon },
  { title: "DAG", href: "/dag-v002", icon: HierarchyIcon },
  { title: "New Project", href: "/new-project", icon: FolderAddIcon },
  { title: "Pick Lists", href: "/pick-lists", icon: SwatchIcon },
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
