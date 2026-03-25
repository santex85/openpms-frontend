import type { MonthDayMeta } from "@/utils/boardDates";

export interface BookingTileLayout {
  leftPercent: number;
  widthPercent: number;
}

/**
 * Positions a stay tile on equal-width day columns.
 * Stay uses half-open [checkInDate, checkOutDate) in ISO YYYY-MM-DD (nights).
 * Visible `days` are calendar columns for the month; clip to the visible range.
 */
export function computeBookingTileLayout(
  days: MonthDayMeta[],
  checkInDate: string,
  checkOutDate: string
): BookingTileLayout | null {
  const n = days.length;
  if (n === 0) {
    return null;
  }

  let startIdx = -1;
  let span = 0;
  for (let i = 0; i < n; i++) {
    const iso = days[i].iso;
    if (iso >= checkInDate && iso < checkOutDate) {
      if (startIdx < 0) {
        startIdx = i;
      }
      span += 1;
    }
  }

  if (span === 0 || startIdx < 0) {
    return null;
  }

  return {
    leftPercent: (startIdx / n) * 100,
    widthPercent: (span / n) * 100,
  };
}
