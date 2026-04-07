import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { computeTaxPreview } from "@/lib/countryPackTaxPreview";
import { formatMoneyAmount } from "@/lib/formatMoney";
import type { CountryPackTaxLine } from "@/types/country-pack";

interface TaxBreakdownProps {
  baseAmount: number | null;
  taxLines: CountryPackTaxLine[];
  currencyCode: string;
}

export function TaxBreakdown({
  baseAmount,
  taxLines,
  currencyCode,
}: TaxBreakdownProps) {
  const { t, i18n } = useTranslation();

  const preview = useMemo(() => {
    if (baseAmount === null || !Number.isFinite(baseAmount) || baseAmount <= 0) {
      return null;
    }
    return computeTaxPreview(baseAmount, taxLines);
  }, [baseAmount, taxLines]);

  if (preview === null || taxLines.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 p-3 text-sm">
      <p className="mb-2 font-medium text-foreground">
        {t("countryPack.taxBreakdownTitle")}
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-1 pr-2 font-medium">{t("countryPack.taxColName")}</th>
            <th className="py-1 pr-2 font-medium">{t("countryPack.taxColRate")}</th>
            <th className="py-1 text-right font-medium">
              {t("countryPack.taxColAmount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {preview.lines.map((line, idx) => (
            <tr key={`${line.name}-${idx}`} className="border-b border-border/60">
              <td className="py-1 pr-2">{line.name}</td>
              <td className="py-1 pr-2 tabular-nums text-muted-foreground">
                {line.rateLabel}
              </td>
              <td className="py-1 text-right tabular-nums">
                {formatMoneyAmount(
                  currencyCode,
                  String(line.amount),
                  i18n.language
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 font-semibold text-foreground">
        {t("countryPack.totalInclTaxes")}:{" "}
        {formatMoneyAmount(
          currencyCode,
          String(preview.totalWithTaxes),
          i18n.language
        )}
      </p>
    </div>
  );
}
