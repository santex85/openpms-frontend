import type { ReactNode } from "react";

import { showApiRouteHints } from "@/lib/showApiRouteHints";
import { cn } from "@/lib/utils";

interface ApiRouteHintProps {
  children: ReactNode;
  className?: string;
}

export function ApiRouteHint({ children, className }: ApiRouteHintProps) {
  if (!showApiRouteHints()) {
    return null;
  }
  return (
    <div className={cn("text-xs text-muted-foreground", className)}>{children}</div>
  );
}

export function ApiRouteInline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!showApiRouteHints()) {
    return null;
  }
  return (
    <span className={cn("font-mono text-[10px] text-muted-foreground", className)}>
      {children}
    </span>
  );
}
