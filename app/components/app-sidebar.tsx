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
  GridTableIcon,
  Tv01Icon,
  Apple01Icon,
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
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  href: string;
  icon: typeof Tv01Icon;
}

const navItems: NavItem[] = [
  { title: "Projects", href: "/projects-main", icon: GridTableIcon },
  { title: "Inbox", href: "/inbox", icon: InboxIcon },
  { title: "Talent", href: "/talent", icon: DiamondIcon },
  { title: "DAG", href: "/dag", icon: HierarchyIcon },
  { title: "New Project", href: "/new-project", icon: FolderAddIcon },
  { title: "Pick Lists", href: "/pick-lists", icon: SwatchIcon },
  { title: "Color Palettes", href: "/color-palettes", icon: SwatchIcon },
  { title: "Series", href: "/series", icon: Tv01Icon },
  { title: "Series | Sort", href: "/series-sort", icon: Tv01Icon },
  { title: "Calories", href: "/calories", icon: Apple01Icon },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="p-4">
        <span className="text-sm font-semibold tracking-tight truncate">
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
    </Sidebar>
  );
}
