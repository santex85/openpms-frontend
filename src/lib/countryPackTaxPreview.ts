import type { CountryPackTaxLine } from "@/types/country-pack";

export interface TaxPreviewLine {
  name: string;
  rateLabel: string;
  amount: number;
}

export interface TaxPreviewResult {
  lines: TaxPreviewLine[];
  totalWithTaxes: number;
}

function parseRate(rateStr: string): number {
  const s = rateStr.trim();
  if (s.endsWith("%")) {
    return Number.parseFloat(s.slice(0, -1)) / 100;
  }
  return Number.parseFloat(s);
}

/** Sort tax lines by `order` then stable index. */
function sortTaxLines(lines: CountryPackTaxLine[]): CountryPackTaxLine[] {
  return [...lines].sort((a, b) => {
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return 0;
  });
}

/**
 * Local tax preview per TZ-10 §4.3 (compound_after chain on net + prior taxes).
 */
export function computeTaxPreview(
  baseAmount: number,
  taxLines: CountryPackTaxLine[]
): TaxPreviewResult {
  if (!Number.isFinite(baseAmount) || taxLines.length === 0) {
    return {
      lines: [],
      totalWithTaxes: baseAmount,
    };
  }

  const sorted = sortTaxLines(taxLines);
  const lines: TaxPreviewLine[] = [];
  let runningTaxSum = 0;

  for (const line of sorted) {
    const rate = parseRate(line.rate);
    if (!Number.isFinite(rate)) {
      continue;
    }
    const compound = line.compound_after === true;
    const basis = compound ? baseAmount + runningTaxSum : baseAmount;
    const amount = basis * rate;
    runningTaxSum += amount;
    lines.push({
      name: line.name,
      rateLabel: line.rate,
      amount,
    });
  }

  return {
    lines,
    totalWithTaxes: baseAmount + runningTaxSum,
  };
}
