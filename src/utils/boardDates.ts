/** ISO date string YYYY-MM-DD in local calendar. */
export function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface MonthDayMeta {
  iso: string;
  date: Date;
}

/** Move calendar anchor by `deltaMonths` (e.g. -1 / +1). */
export function shiftMonthAnchor(anchor: Date, deltaMonths: number): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth() + deltaMonths, 1);
  return d;
}

/** Move `anchor` by `deltaWeeks` weeks, clamped to the calendar month of `anchor`. */
export function shiftWeekWithinMonth(anchor: Date, deltaWeeks: number): Date {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const next = new Date(anchor);
  next.setDate(next.getDate() + deltaWeeks * 7);
  if (next < first) {
    return first;
  }
  if (next > last) {
    return last;
  }
  return next;
}

/** Inclusive range: first and last day of the month containing `anchor`. */
export function getMonthRange(anchor: Date): {
  startIso: string;
  endIso: string;
  days: MonthDayMeta[];
} {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const days: MonthDayMeta[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const copy = new Date(d);
    days.push({ iso: formatIsoDateLocal(copy), date: copy });
  }
  return {
    startIso: formatIsoDateLocal(first),
    endIso: formatIsoDateLocal(last),
    days,
  };
}

/** First 14 days of the month containing `anchor` (for compact rate grid). */
export function getMonthFortnightRange(anchor: Date): {
  startIso: string;
  endIso: string;
  days: MonthDayMeta[];
} {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const days: MonthDayMeta[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    const copy = new Date(d);
    days.push({ iso: formatIsoDateLocal(copy), date: copy });
  }
  const lastDay = days[days.length - 1]!.date;
  return {
    startIso: formatIsoDateLocal(first),
    endIso: formatIsoDateLocal(lastDay),
    days,
  };
}

/** Inclusive day range from `start` to `end` (calendar days, local). */
export function getInclusiveDayRange(
  start: Date,
  end: Date
): { startIso: string; endIso: string; days: MonthDayMeta[] } {
  const days: MonthDayMeta[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const copy = new Date(d);
    days.push({ iso: formatIsoDateLocal(copy), date: copy });
  }
  if (days.length === 0) {
    const iso = formatIsoDateLocal(start);
    return { startIso: iso, endIso: iso, days: [{ iso, date: new Date(start) }] };
  }
  const first = days[0]!;
  const last = days[days.length - 1]!;
  return { startIso: first.iso, endIso: last.iso, days };
}

/** 14-day window within the month of `monthAnchor`, aligned to `weekStartHint`. */
export function getFortnightInMonth(
  monthAnchor: Date,
  weekStartHint: Date
): { startIso: string; endIso: string; days: MonthDayMeta[] } {
  const full = getMonthRange(monthAnchor);
  const first = full.days[0]!.date;
  const last = full.days[full.days.length - 1]!.date;
  let start = new Date(weekStartHint);
  if (start < first) {
    start = new Date(first);
  }
  if (start > last) {
    start = new Date(last);
  }
  let end = new Date(start);
  end.setDate(end.getDate() + 13);
  if (end > last) {
    end = new Date(last);
    start = new Date(end);
    start.setDate(start.getDate() - 13);
    if (start < first) {
      start = new Date(first);
    }
  }
  return getInclusiveDayRange(start, end);
}
