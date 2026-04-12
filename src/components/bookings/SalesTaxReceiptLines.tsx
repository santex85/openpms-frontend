import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useTaxConfig } from "@/hooks/useTaxConfig";
import { formatMoneyAmount } from "@/lib/formatMoney";
import { resolveTaxConfig } from "@/lib/propertySalesTaxStorage";
import { formatTaxRatePercentDisplay, getSalesTaxReceiptAmounts } from "@/lib/salesTax";

interface SalesTaxReceiptLinesProps {
  propertyId: string | undefined;
  /** Folio charges gross (numeric sum of charge transactions). */
  chargesTotal: number;
  currencyCode: string;
}

export function SalesTaxReceiptLines({
  propertyId,
  chargesTotal,
  currencyCode,
}: SalesTaxReceiptLinesProps) {
  const { t, i18n } = useTranslation();
  const taxQ = useTaxConfig(
    propertyId !== undefined && propertyId !== "" ? propertyId : null
  );

  const resolved = useMemo(
    () => resolveTaxConfig(taxQ.data ?? null, propertyId),
    [taxQ.data, propertyId]
  );

  const amounts = getSalesTaxReceiptAmounts(
    resolved.tax_mode,
    resolved.tax_rate,
    chargesTotal
  );

  if (taxQ.isPending) {
    return null;
  }

  if (amounts === null) {
    return null;
  }

  const label = resolved.tax_name.trim() || "VAT";
  const rate = formatTaxRatePercentDisplay(resolved.tax_rate);

  if (resolved.tax_mode === "inclusive") {
    return (
      <div className="mt-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
        {t("salesTax.receipt.inclusive", {
          label,
          rate,
          amount: formatMoneyAmount(
            currencyCode,
            String(amounts.taxAmount),
            i18n.language
          ),
        })}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm">
      <p className="text-foreground">
        {t("salesTax.receipt.exclusiveTax", {
          label,
          rate,
          amount: formatMoneyAmount(
            currencyCode,
            String(amounts.taxAmount),
            i18n.language
          ),
        })}
      </p>
      <p className="font-medium text-foreground">
        {t("salesTax.receipt.exclusiveTotal", {
          total: formatMoneyAmount(
            currencyCode,
            String(amounts.grossAmount),
            i18n.language
          ),
        })}
      </p>
    </div>
  );
}
