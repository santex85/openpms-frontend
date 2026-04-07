function numberLocaleFromLang(lang: string | undefined): string {
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

/** Format API decimal string with property currency (ISO 4217). */
export function formatMoneyAmount(
  isoCurrency: string,
  amountRaw: string,
  localeHint?: string
): string {
  const n = Number.parseFloat(amountRaw);
  if (!Number.isFinite(n)) {
    return amountRaw;
  }
  const cur = isoCurrency.trim().toUpperCase();
  const locale = numberLocaleFromLang(localeHint);
  if (cur.length !== 3) {
    return `${amountRaw} ${isoCurrency}`.trim();
  }
  if (cur === "THB") {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
    return `${formatted}\u00a0฿`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${amountRaw} ${cur}`;
  }
}
