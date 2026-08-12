import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Flat "cyber/tech" surface that uses theme tokens so it renders correctly
 * in both light and dark mode. Hover ring driven by --accent-cyber.
 */
export function CyberCard({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-card border border-border transition-all duration-200",
        interactive &&
          "cursor-pointer hover:border-primary/50 hover:shadow-[0_0_0_1px_var(--color-primary),0_8px_24px_-12px_var(--color-primary)] hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
