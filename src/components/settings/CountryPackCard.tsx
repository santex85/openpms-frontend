import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { formatCountryPackRateFraction } from "@/lib/countryPackTaxRules";
import type { CountryPackDetail } from "@/types/country-pack";

interface CountryPackCardProps {
  pack: CountryPackDetail;
  /** Fallback when needed (pack always has timezone in API read). */
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

  const displayTaxes = useMemo(
    () => [...(pack.taxes ?? [])].filter((x) => x.active !== false),
    [pack.taxes]
  );

  return (
    <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
      <div className="grid gap-1">
        <p>
          <span className="font-medium text-foreground">
            {t("countryPack.currency")}
          </span>{" "}
          <span className="text-muted-foreground">
            {pack.currency_code} ({pack.currency_symbol})
          </span>
        </p>
        <p>
          <span className="font-medium text-foreground">
            {t("countryPack.timezone")}
          </span>{" "}
          <span className="text-muted-foreground">{tz}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">
            {t("countryPack.dateFormat")}
          </span>{" "}
          <span className="text-muted-foreground">{pack.date_format}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">
            {t("countryPack.defaultTimes")}
          </span>{" "}
          <span className="text-muted-foreground tabular-nums">
            {pack.default_checkin_time?.slice(0, 5) ?? "—"} /{" "}
            {pack.default_checkout_time?.slice(0, 5) ?? "—"}
          </span>
        </p>
      </div>
      <div>
        <p className="mb-1 font-medium text-foreground">
          {t("countryPack.taxes")}
        </p>
        {displayTaxes.length === 0 ? (
          <p className="text-muted-foreground">{t("countryPack.noTaxLines")}</p>
        ) : (
          <ul className="space-y-1 text-muted-foreground">
            {displayTaxes.map((line) => (
              <li key={line.code}>
                {line.name}: {formatCountryPackRateFraction(Number(line.rate))}
                {line.inclusive ? ` · ${t("countryPack.inclusive")}` : null}
                {!line.inclusive ? ` · ${t("countryPack.exclusive")}` : null}
                {line.compound_after !== null &&
                String(line.compound_after).trim() !== "" ? (
                  <span>
                    {" "}
                    · {t("countryPack.compoundAfterCode", { code: line.compound_after })}
                  </span>
                ) : null}
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
          {(pack.payment_methods ?? []).length === 0 ? (
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
