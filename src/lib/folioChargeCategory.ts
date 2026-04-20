import type { FolioChargeCategory } from "@/api/folioCategories";

/** When GET /folio-categories fails or returns empty, keep manual charges usable. */
export const FOLIO_CHARGE_FALLBACK_OPTIONS: { code: string; label: string }[] = [
  { code: "food_beverage", label: "Food & beverage" },
  { code: "spa", label: "Spa & other services" },
  { code: "minibar", label: "Minibar" },
  { code: "tax", label: "Tax" },
  { code: "discount", label: "Discount" },
  { code: "misc", label: "Miscellaneous" },
  { code: "service", label: "Service" },
];

export const DEFAULT_MANUAL_CHARGE_CODE = "spa";

/**
 * Active charge categories for the manual folio charge dialog.
 * Excludes `payment` (payments use another form) and `room_charge` (stay is on the booking).
 */
export function filterManualFolioChargeCategories(
  rows: FolioChargeCategory[] | undefined
): { code: string; label: string }[] {
  if (rows === undefined || rows.length === 0) {
    return FOLIO_CHARGE_FALLBACK_OPTIONS;
  }
  const filtered = rows.filter(
    (r) =>
      r.is_active && r.code !== "payment" && r.code !== "room_charge"
  );
  if (filtered.length === 0) {
    return FOLIO_CHARGE_FALLBACK_OPTIONS;
  }
  return [...filtered]
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.code.localeCompare(b.code)
    )
    .map((r) => ({ code: r.code, label: r.label }));
}
