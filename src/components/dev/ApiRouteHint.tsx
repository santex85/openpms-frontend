import type { ReactNode } from "react";

import { showApiRouteHints } from "@/lib/devUi";

interface ApiRouteHintProps {
  /** Short label, e.g. `GET /bookings` */
  children: ReactNode;
  className?: string;
}

/**
 * Renders a monospace API hint only when dev UI is enabled
 * (`VITE_SHOW_API_ROUTES=true` or `localStorage openpms:devUi=1` in DEV).
 */
export function ApiRouteHint({
  children,
  className = "",
}: ApiRouteHintProps): ReactNode {
  if (!showApiRouteHints()) {
    return null;
  }
  return (
    <code
      className={`rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground ${className}`}
    >
      {children}
    </code>
  );
}
