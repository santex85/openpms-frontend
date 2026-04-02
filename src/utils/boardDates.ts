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

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Inclusive list of calendar days from startIso to endIso (YYYY-MM-DD). */
export function buildDaysInclusive(startIso: string, endIso: string): MonthDayMeta[] {
  const start = parseIsoLocal(startIso);
  const end = parseIsoLocal(endIso);
  if (start > end) {
    return buildDaysInclusive(endIso, startIso);
  }
  const days: MonthDayMeta[] = [];
  for (
    let cur = new Date(start);
    cur <= end;
    cur.setDate(cur.getDate() + 1)
  ) {
    const copy = new Date(cur.getTime());
    days.push({ iso: formatIsoDateLocal(copy), date: copy });
  }
  return days;
}

/** Monday 00:00 of the week containing `d` (local). */
export function startOfIsoWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
}

/** 14 consecutive days starting Monday of the week containing `anchor`. */
export function getFortnightRange(anchor: Date): {
  startIso: string;
  endIso: string;
  days: MonthDayMeta[];
} {
  const mon = startOfIsoWeek(anchor);
  const end = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 13);
  const startIso = formatIsoDateLocal(mon);
  const endIso = formatIsoDateLocal(end);
  return {
    startIso,
    endIso,
    days: buildDaysInclusive(startIso, endIso),
  };
}

/** 7 days Mon–Sun for the week containing `anchor`. */
export function getWeekRange(anchor: Date): {
  startIso: string;
  endIso: string;
  days: MonthDayMeta[];
} {
  const mon = startOfIsoWeek(anchor);
  const end = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const startIso = formatIsoDateLocal(mon);
  const endIso = formatIsoDateLocal(end);
  return {
    startIso,
    endIso,
    days: buildDaysInclusive(startIso, endIso),
  };
}

export type BoardRangeMode = "month" | "fortnight" | "custom";

export function getBoardRange(
  mode: BoardRangeMode,
  navAnchor: Date,
  customFromIso: string,
  customToIso: string
): { startIso: string; endIso: string; days: MonthDayMeta[] } {
  if (mode === "month") {
    return getMonthRange(navAnchor);
  }
  if (mode === "fortnight") {
    return getFortnightRange(navAnchor);
  }
  const from = customFromIso.trim();
  const to = customToIso.trim();
  if (from !== "" && to !== "") {
    const days = buildDaysInclusive(from, to);
    return {
      startIso: days[0]?.iso ?? from,
      endIso: days[days.length - 1]?.iso ?? to,
      days,
    };
  }
  return getMonthRange(navAnchor);
}
