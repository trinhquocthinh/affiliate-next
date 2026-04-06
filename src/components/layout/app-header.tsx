"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";

export function AppHeader({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();

  function toggleTheme() {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }

  const ThemeIcon =
    theme === "dark" ? SunIcon : theme === "light" ? MoonIcon : MonitorIcon;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 md:px-8 sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        {title && (
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
        )}
      </div>
      {/* <button
        onClick={toggleTheme}
        title="Toggle Light/Dark Mode"
        className="w-10 h-10 rounded-full flex justify-center items-center bg-background/70 border border-border text-foreground text-xl backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:text-primary"
      >
        <ThemeIcon className="h-5 w-5" />
      </button> */}
    </header>
  );
}
