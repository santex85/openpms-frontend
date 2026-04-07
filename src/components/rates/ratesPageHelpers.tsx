import type { ReactElement } from "react";

import i18n from "@/i18n";
import { formatApiError } from "@/lib/formatApiError";
import { isAxiosForbidden } from "@/lib/forbiddenError";
import type { AvailabilityCell } from "@/types/inventory";

/** Sentinel for Radix Select: open «new plan» dialog instead of changing value. */
export const NEW_RATE_PLAN_SELECT_VALUE = "__new_rate_plan__";

export function formatCreateRatePlan403Error(err: unknown): string {
  if (isAxiosForbidden(err)) {
    return i18n.t("rates.forbidden403");
  }
  return formatApiError(err);
}

export function availabilityOccupancyLine(
  cell: AvailabilityCell | undefined,
  availabilityPending: boolean,
  availabilityErrored: boolean
): ReactElement | null {
  if (availabilityErrored) {
    return null;
  }
  if (availabilityPending) {
    return (
      <span className="block text-[10px] leading-tight text-muted-foreground">
        …
      </span>
    );
  }
  if (cell === undefined) {
    return (
      <span className="block text-[10px] leading-tight text-muted-foreground">
        —
      </span>
    );
  }
  const blocked =
    cell.blocked_rooms > 0
      ? i18n.t("rates.occupancy.blocked", { count: cell.blocked_rooms })
      : "";
  return (
    <span className="block text-[10px] leading-tight text-muted-foreground">
      {i18n.t("rates.occupancy.summary", {
        booked: cell.booked_rooms,
        blocked,
        free: cell.available_rooms,
      })}
    </span>
  );
}
