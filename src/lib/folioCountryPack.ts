import type { FolioTransactionRead } from "@/api/folio";

export const COUNTRY_PACK_TAX_PREFIX = "[country-pack-tax]";

export function isCountryPackAutoTaxTransaction(
  t: FolioTransactionRead
): boolean {
  const cat = t.category.trim().toLowerCase();
  const desc = (t.description ?? "").trim();
  return cat === "tax" && desc.startsWith(COUNTRY_PACK_TAX_PREFIX);
}

export function stripCountryPackTaxDescription(
  description: string | null
): string {
  const d = (description ?? "").trim();
  if (d.startsWith(COUNTRY_PACK_TAX_PREFIX)) {
    return d.slice(COUNTRY_PACK_TAX_PREFIX.length).trim();
  }
  return d;
}

/** Manual reverse allowed in UI (not auto-tax rows). */
export function folioRowAllowsManualReverse(t: FolioTransactionRead): boolean {
  if (isCountryPackAutoTaxTransaction(t)) {
    return false;
  }
  return t.voidable !== false;
}
