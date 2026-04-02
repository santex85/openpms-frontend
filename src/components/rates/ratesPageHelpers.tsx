import type { ReactElement } from "react";

import { formatApiError } from "@/lib/formatApiError";
import { ForbiddenMessages, isAxiosForbidden } from "@/lib/forbiddenError";
import type { AvailabilityCell } from "@/types/inventory";

export const DEFAULT_CANCELLATION_POLICY =
  "Отмена бесплатно не позднее чем за 24 часа до заезда; при более поздней отмене может удерживаться стоимость первой ночи.";

/** Sentinel for Radix Select: open «new plan» dialog instead of changing value. */
export const NEW_RATE_PLAN_SELECT_VALUE = "__new_rate_plan__";

export function formatCreateRatePlan403Error(err: unknown): string {
  if (isAxiosForbidden(err)) {
    return ForbiddenMessages.ratePlanWrite;
  }
  return formatApiError(err);
}

export function monthTitleRu(anchor: Date): string {
  return anchor.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
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
  const blockedSuffix =
    cell.blocked_rooms > 0 ? ` · блок ${String(cell.blocked_rooms)}` : "";
  return (
    <span className="block text-[10px] leading-tight text-muted-foreground">
      занято {cell.booked_rooms}
      {blockedSuffix} · свободно {cell.available_rooms}
    </span>
  );
}
