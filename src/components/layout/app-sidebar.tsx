"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HomeIcon,
  PlusCircleIcon,
  ListIcon,
  InboxIcon,
  UsersIcon,
  SettingsIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/layout/theme-provider";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
};

const buyerItems: NavItem[] = [
  { title: "New Request", href: "/buyer", icon: PlusCircleIcon },
  { title: "My Requests", href: "/buyer/requests", icon: ListIcon },
];

const affiliateItems: NavItem[] = [
  { title: "Queue", href: "/affiliate", icon: InboxIcon },
];

const adminItems: NavItem[] = [
  { title: "Users", href: "/admin/users", icon: UsersIcon },
  { title: "Config", href: "/admin/config", icon: SettingsIcon },
];

type AppSidebarProps = {
  user: {
    email: string;
    displayName: string | null;
    role: string;
  };
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { setOpenMobile } = useSidebar();

  const isAffiliate = user.role === "AFFILIATE" || user.role === "ADMIN";
  const isAdmin = user.role === "ADMIN";

  // Close mobile sidebar on navigation
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <Image
                  src="/assets/logo.png"
                  alt="Shop Quành"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">Shop Quành</span>
                <span className="text-xs text-muted-foreground capitalize">
                  We fraud &quot;in pack&quot;
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/" />} isActive={pathname === "/"} tooltip="Home">
                <HomeIcon />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-[11px] font-semibold">Buyer</SidebarGroupLabel>
          <SidebarMenu>
            {buyerItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton render={<Link href={item.href} />} isActive={pathname === item.href} tooltip={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isAffiliate && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider text-[11px] font-semibold">Affiliate</SidebarGroupLabel>
            <SidebarMenu>
              {affiliateItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={pathname === item.href} tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider text-[11px] font-semibold">Admin</SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={pathname === item.href} tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" />
              }>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(user.displayName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none text-left">
                  <span className="text-sm font-medium truncate">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.role.toLowerCase()}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <SunIcon className="mr-2 h-4 w-4" />
                  Light
                  {theme === "light" && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <MoonIcon className="mr-2 h-4 w-4" />
                  Dark
                  {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <MonitorIcon className="mr-2 h-4 w-4" />
                  System
                  {theme === "system" && <span className="ml-auto text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
