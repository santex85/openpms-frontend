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

/** Parse YYYY-MM-DD as local calendar date (00:00). */
export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Inclusive list of calendar days from startIso to endIso (YYYY-MM-DD). */
export function buildDaysInclusive(startIso: string, endIso: string): MonthDayMeta[] {
  const start = parseIsoDateLocal(startIso);
  const end = parseIsoDateLocal(endIso);
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

/** Nights: check-out is exclusive (room night count), dates YYYY-MM-DD local. */
export function countBookingNights(
  checkInIso: string | null,
  checkOutIso: string | null
): number | null {
  if (
    checkInIso === null ||
    checkOutIso === null ||
    checkInIso === "" ||
    checkOutIso === ""
  ) {
    return null;
  }
  const a = parseIsoDateLocal(checkInIso);
  const b = parseIsoDateLocal(checkOutIso);
  const days = Math.round((b.getTime() - a.getTime()) / 86400000);
  return days >= 0 ? days : null;
}

/** Map i18next language code (e.g. en, en-US) to BCP 47 for Intl. */
export function boardLocaleFromI18n(lang: string | undefined): string {
  if (lang === undefined || lang === "") {
    return "ru-RU";
  }
  const base = lang.split("-")[0] ?? "ru";
  if (base === "en") {
    return "en-GB";
  }
  if (base === "th") {
    return "th-TH";
  }
  if (base === "vi") {
    return "vi-VN";
  }
  if (base === "id") {
    return "id-ID";
  }
  if (base === "ms") {
    return "ms-MY";
  }
  if (base === "km") {
    return "km-KH";
  }
  return "ru-RU";
}

/** Month + year label for rate grid / calendars (locale-specific). */
export function monthTitleLocale(anchor: Date, localeTag: string): string {
  const raw = anchor.toLocaleDateString(localeTag, {
    month: "long",
    year: "numeric",
  });
  if (localeTag.startsWith("ru")) {
    return raw.replace(/\sГ\.\s*$/u, " г.");
  }
  return raw;
}

/** Russian label: 1 ночь / 2 ночи / 5 ночей. */
export function formatBookingNightsRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return `${n} ночей`;
  }
  if (mod10 === 1) {
    return `${n} ночь`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${n} ночи`;
  }
  return `${n} ночей`;
}

/** e.g. «2 апр – 18 апр 2026» (locale-specific). */
export function formatBookingStayLocale(
  checkInIso: string | null,
  checkOutIso: string | null,
  localeTag: string
): string | null {
  if (checkInIso === null || checkOutIso === null) {
    return null;
  }
  const ci = parseIsoDateLocal(checkInIso);
  const co = parseIsoDateLocal(checkOutIso);
  const dayMonth = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
  });
  const yearFmt = new Intl.DateTimeFormat(localeTag, { year: "numeric" });
  const y1 = yearFmt.format(ci);
  const y2 = yearFmt.format(co);
  const left = dayMonth.format(ci);
  const right = dayMonth.format(co);
  if (y1 === y2) {
    return `${left} – ${right} ${y2}`;
  }
  return `${left} ${y1} – ${right} ${y2}`;
}

/** @deprecated Prefer formatBookingStayLocale(..., boardLocaleFromI18n(lang)). */
export function formatBookingStayRu(
  checkInIso: string | null,
  checkOutIso: string | null
): string | null {
  return formatBookingStayLocale(checkInIso, checkOutIso, "ru-RU");
}

/** Property time like "14:00:00" → "14:00" for display. */
export function formatPropertyTimeHm(
  isoTime: string | null | undefined
): string | null {
  if (isoTime === null || isoTime === undefined) {
    return null;
  }
  const t = isoTime.trim();
  if (t === "") {
    return null;
  }
  return t.length >= 5 ? t.slice(0, 5) : t;
}

/** Local booking date + optional hotel check-in/out time, ru-RU. */
export function formatBookingDateTimeRu(
  dateIso: string | null,
  propertyTimeHm: string | null | undefined
): string {
  if (dateIso === null || dateIso === "") {
    return "—";
  }
  const d = parseIsoDateLocal(dateIso);
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  const hm =
    propertyTimeHm !== null &&
    propertyTimeHm !== undefined &&
    propertyTimeHm.trim() !== ""
      ? propertyTimeHm.trim().slice(0, 5)
      : null;
  return hm !== null ? `${datePart}, ${hm}` : datePart;
}
