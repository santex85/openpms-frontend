import type { TaxMode } from "@/types/tax-config";

export interface SalesTaxPreviewResult {
  /** Basis label key for i18n: previewBaseInclusive | previewBaseExclusive */
  basisKind: "inclusive" | "exclusive";
  /** Example amount (THB etc.) entered as basis */
  basisAmount: number;
  /** VAT / tax amount in currency units */
  taxAmount: number;
  /** Net (exclusive basis) */
  netAmount: number;
  /** Gross (inclusive total) */
  grossAmount: number;
}

function clampRateFraction(rate: number): number {
  if (!Number.isFinite(rate)) {
    return 0;
  }
  return Math.min(1, Math.max(0, rate));
}

/**
 * Preview for a fixed example amount (e.g. 10_000).
 * - inclusive: basis is gross (tax-included); we extract tax.
 * - exclusive: basis is net; we add tax on top.
 */
export function computeSalesTaxPreview(
  mode: TaxMode,
  rateFraction: number,
  basisAmount: number
): SalesTaxPreviewResult | null {
  if (mode === "off") {
    return null;
  }
  const r = clampRateFraction(rateFraction);
  if (!Number.isFinite(basisAmount) || basisAmount <= 0 || r <= 0) {
    return null;
  }
  if (mode === "inclusive") {
    const gross = basisAmount;
    const taxAmount = (gross * r) / (1 + r);
    const net = gross - taxAmount;
    return {
      basisKind: "inclusive",
      basisAmount: gross,
      taxAmount,
      netAmount: net,
      grossAmount: gross,
    };
  }
  const net = basisAmount;
  const taxAmount = net * r;
  const gross = net + taxAmount;
  return {
    basisKind: "exclusive",
    basisAmount: net,
    taxAmount,
    netAmount: net,
    grossAmount: gross,
  };
}

export interface SalesTaxReceiptAmounts {
  /** Tax extracted from gross (inclusive mode). */
  taxAmount: number;
  /** Net before tax (inclusive: derived; exclusive: same as charges total). */
  netAmount: number;
  /** Total including tax (exclusive: net + tax; inclusive: same as charges total). */
  grossAmount: number;
}

/**
 * Numeric breakdown for folio **charges total** (room + extras + pack taxes as one number).
 * Returns null when nothing to show.
 */
export function getSalesTaxReceiptAmounts(
  mode: TaxMode,
  rateFraction: number,
  chargesTotal: number
): SalesTaxReceiptAmounts | null {
  const r = clampRateFraction(rateFraction);
  if (
    mode === "off" ||
    !Number.isFinite(chargesTotal) ||
    chargesTotal <= 0 ||
    r <= 0
  ) {
    return null;
  }
  if (mode === "inclusive") {
    const gross = chargesTotal;
    const taxAmount = (gross * r) / (1 + r);
    const netAmount = gross - taxAmount;
    return { taxAmount, netAmount, grossAmount: gross };
  }
  const net = chargesTotal;
  const taxAmount = net * r;
  return {
    taxAmount,
    netAmount: net,
    grossAmount: net + taxAmount,
  };
}

/** Format fraction (0–1) as a whole or decimal percent value for display (no % sign). */
export function formatTaxRatePercentDisplay(rateFraction: number): string {
  const p = clampRateFraction(rateFraction) * 100;
  if (Number.isInteger(p)) {
    return String(p);
  }
  return p.toFixed(2).replace(/\.?0+$/, "");
}
