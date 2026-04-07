import { parseIsoDateLocal } from "@/utils/boardDates";

const LOCALE_BY_LANG: Record<string, string> = {
  ru: "ru-RU",
  en: "en-GB",
  th: "th-TH",
  vi: "vi-VN",
  km: "km-KH",
  id: "id-ID",
  ms: "ms-MY",
};

/** Short date for lists (e.g. 2 Apr 2026 / 2 апр. 2026 г.). */
export function formatShortLocaleDate(
  iso: string | null | undefined,
  lang: string
): string {
  if (iso === null || iso === undefined || iso.trim() === "") {
    return "—";
  }
  const lng = lang.split("-")[0] ?? "ru";
  const locale = LOCALE_BY_LANG[lng] ?? LOCALE_BY_LANG.ru;
  const d = parseIsoDateLocal(iso);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
