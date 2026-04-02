/** Format API decimal string with property currency (ISO 4217). */
export function formatMoneyAmount(isoCurrency: string, amountRaw: string): string {
  const n = Number.parseFloat(amountRaw);
  if (!Number.isFinite(n)) {
    return amountRaw;
  }
  const cur = isoCurrency.trim().toUpperCase();
  if (cur.length !== 3) {
    return `${amountRaw} ${isoCurrency}`.trim();
  }
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${amountRaw} ${cur}`;
  }
}
