import type { TaxConfigPut, TaxConfigRead, TaxMode } from "@/types/tax-config";

const PREFIX = "openpms.taxConfig.";

function key(propertyId: string): string {
  return `${PREFIX}${propertyId}`;
}

function clampRateFraction(r: number): number {
  if (!Number.isFinite(r)) {
    return 0;
  }
  return Math.min(1, Math.max(0, r));
}

export function readStoredTaxConfig(propertyId: string): TaxConfigPut | null {
  try {
    const raw = localStorage.getItem(key(propertyId));
    if (raw === null || raw === "") {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    const mode = o.tax_mode;
    if (mode !== "off" && mode !== "inclusive" && mode !== "exclusive") {
      return null;
    }
    const name = typeof o.tax_name === "string" ? o.tax_name : "VAT";
    const rate =
      typeof o.tax_rate === "number"
        ? o.tax_rate
        : Number.parseFloat(String(o.tax_rate ?? ""));
    if (!Number.isFinite(rate)) {
      return null;
    }
    return {
      tax_mode: mode as TaxMode,
      tax_name: name,
      tax_rate: clampRateFraction(rate),
    };
  } catch {
    return null;
  }
}

export function writeStoredTaxConfig(
  propertyId: string,
  value: TaxConfigPut
): void {
  try {
    localStorage.setItem(key(propertyId), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearStoredTaxConfig(propertyId: string): void {
  try {
    localStorage.removeItem(key(propertyId));
  } catch {
    /* ignore */
  }
}

/** Prefer GET response; else localStorage; else defaults. */
export function resolveTaxConfig(
  api: TaxConfigRead | null | undefined,
  propertyId: string | undefined
): TaxConfigPut {
  if (api !== null && api !== undefined) {
    return {
      tax_mode: api.tax_mode,
      tax_name:
        typeof api.tax_name === "string" && api.tax_name.trim() !== ""
          ? api.tax_name.trim()
          : "VAT",
      tax_rate: clampRateFraction(api.tax_rate),
    };
  }
  if (propertyId !== undefined && propertyId !== "") {
    const local = readStoredTaxConfig(propertyId);
    if (local !== null) {
      return local;
    }
  }
  return {
    tax_mode: "off",
    tax_name: "VAT",
    tax_rate: 0,
  };
}
