import { useTranslation } from "react-i18next";

import type { CountryPackDetail } from "@/types/country-pack";

interface CountryPackCardProps {
  pack: CountryPackDetail;
  /** Property timezone when pack detail omits it. */
  propertyTimezone?: string | null;
}

export function CountryPackCard({
  pack,
  propertyTimezone,
}: CountryPackCardProps) {
  const { t } = useTranslation();
  const tz =
    pack.timezone?.trim() ||
    propertyTimezone?.trim() ||
    t("common.notAvailable");

  const sortedTaxes = [...pack.tax_lines].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
      <div className="grid gap-1">
        <p>
          <span className="font-medium text-foreground">
            {t("countryPack.currency")}
          </span>{" "}
          <span className="text-muted-foreground">
            {pack.currency} ({pack.symbol})
          </span>
        </p>
        <p>
          <span className="font-medium text-foreground">
            {t("countryPack.timezone")}
          </span>{" "}
          <span className="text-muted-foreground">{tz}</span>
        </p>
      </div>
      <div>
        <p className="mb-1 font-medium text-foreground">
          {t("countryPack.taxes")}
        </p>
        {sortedTaxes.length === 0 ? (
          <p className="text-muted-foreground">{t("countryPack.noTaxLines")}</p>
        ) : (
          <ul className="space-y-1 text-muted-foreground">
            {sortedTaxes.map((line, idx) => (
              <li key={`${line.name}-${idx}`}>
                {line.name}: {line.rate}
                {line.inclusive ? ` · ${t("countryPack.inclusive")}` : null}
                {line.exclusive ? ` · ${t("countryPack.exclusive")}` : null}
                {line.compound_after ? ` · ${t("countryPack.compound")}` : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 font-medium text-foreground">
          {t("countryPack.paymentMethods")}
        </p>
        <div className="flex flex-wrap gap-1">
          {pack.payment_methods.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            pack.payment_methods.map((m) => (
              <span
                key={m}
                className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs"
              >
                {m}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
