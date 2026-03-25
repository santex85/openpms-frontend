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
