import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProperties } from "@/hooks/useProperties";
import { usePutTaxConfig, useTaxConfig } from "@/hooks/useTaxConfig";
import { formatApiError } from "@/lib/formatApiError";
import { formatMoneyAmount } from "@/lib/formatMoney";
import {
  resolveTaxConfig,
  writeStoredTaxConfig,
} from "@/lib/propertySalesTaxStorage";
import { computeSalesTaxPreview } from "@/lib/salesTax";
import { toastInfo, toastSuccess } from "@/lib/toast";
import { usePropertyStore } from "@/stores/property-store";
import type { TaxConfigPut, TaxMode } from "@/types/tax-config";

const PREVIEW_BASIS = 10_000;

interface TaxConfigCardProps {
  canManage: boolean;
}

function parseRatePercent(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(",", ".").trim());
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(100, Math.max(0, n));
}

export function TaxConfigCard({ canManage }: TaxConfigCardProps) {
  const { t, i18n } = useTranslation();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: properties } = useProperties();
  const taxQ = useTaxConfig(selectedPropertyId);
  const putMut = usePutTaxConfig();

  const [mode, setMode] = useState<TaxMode>("off");
  const [label, setLabel] = useState("VAT");
  const [rateStr, setRateStr] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const r = resolveTaxConfig(taxQ.data ?? null, selectedPropertyId ?? undefined);
    setMode(r.tax_mode);
    setLabel(r.tax_name.trim() !== "" ? r.tax_name : "VAT");
    setRateStr(
      r.tax_rate === 0
        ? "0"
        : String(Math.round(r.tax_rate * 1e6) / 1e4)
    );
    setFormError(null);
  }, [taxQ.data, selectedPropertyId]);

  const ratePercent = parseRatePercent(rateStr) ?? 0;
  const rateFraction = ratePercent / 100;

  const previewCurrency = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return "THB";
    }
    return (
      properties.find((p) => p.id === selectedPropertyId)?.currency?.trim().toUpperCase() ??
      "THB"
    );
  }, [selectedPropertyId, properties]);

  const preview = useMemo(() => {
    return computeSalesTaxPreview(mode, rateFraction, PREVIEW_BASIS);
  }, [mode, rateFraction]);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    if (selectedPropertyId === null) {
      setFormError(t("settings.billing.pickProperty"));
      return;
    }
    const rate = parseRatePercent(rateStr);
    if (rate === null) {
      setFormError(t("settings.billing.rateInvalid"));
      return;
    }
    const labelTrim = label.trim() || "VAT";
    const body: TaxConfigPut = {
      tax_mode: mode,
      tax_name: mode === "off" ? "" : labelTrim,
      tax_rate: mode === "off" ? 0 : rate / 100,
    };

    try {
      await putMut.mutateAsync({
        propertyId: selectedPropertyId,
        body,
      });
      writeStoredTaxConfig(selectedPropertyId, body);
      toastSuccess(t("settings.billing.saved"));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        writeStoredTaxConfig(selectedPropertyId, body);
        toastInfo(t("settings.billing.savedLocalOnly"));
        return;
      }
      setFormError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("settings.billing.noPermission")}
      </div>
    );
  }

  if (selectedPropertyId === null) {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("settings.billing.pickProperty")}
      </div>
    );
  }

  if (taxQ.isPending) {
    return (
      <div
        className="h-32 animate-pulse rounded-md border border-border bg-muted/30"
        aria-hidden
      />
    );
  }

  if (taxQ.isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {formatApiError(taxQ.error)}
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.billing.title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.billing.intro")}
        </p>
        <ApiRouteHint className="mt-2">
          {`PUT /properties/{property_id}/tax-config`}
        </ApiRouteHint>
      </div>

      <form className="max-w-lg space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            {t("settings.billing.modeLabel")}
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {(
              [
                ["off", t("settings.billing.modeOff")],
                ["inclusive", t("settings.billing.modeInclusive")],
                ["exclusive", t("settings.billing.modeExclusive")],
              ] as const
            ).map(([value, text]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted/40"
              >
                <input
                  type="radio"
                  name="sales-tax-mode"
                  className="h-4 w-4 accent-primary"
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                  }}
                />
                <span>{text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="sales-tax-label" className="text-sm font-medium">
              {t("settings.billing.taxName")}
            </label>
            <Input
              id="sales-tax-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
              }}
              placeholder="VAT"
              autoComplete="off"
              disabled={mode === "off"}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sales-tax-rate" className="text-sm font-medium">
              {t("settings.billing.taxRate")}
            </label>
            <Input
              id="sales-tax-rate"
              type="text"
              inputMode="decimal"
              value={rateStr}
              onChange={(e) => {
                setRateStr(e.target.value);
              }}
              placeholder="7"
              autoComplete="off"
              disabled={mode === "off"}
            />
          </div>
        </div>

        {preview !== null && mode !== "off" ? (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">
              {t("settings.billing.previewTitle", {
                amount: formatMoneyAmount(
                  previewCurrency,
                  String(PREVIEW_BASIS),
                  i18n.language
                ),
              })}
            </p>
            <p className="mt-1 text-muted-foreground">
              {preview.basisKind === "inclusive"
                ? t("settings.billing.previewInclusive", {
                    label: label.trim() || "VAT",
                    rate: String(ratePercent),
                    gross: formatMoneyAmount(
                      previewCurrency,
                      String(preview.grossAmount),
                      i18n.language
                    ),
                    tax: formatMoneyAmount(
                      previewCurrency,
                      String(preview.taxAmount),
                      i18n.language
                    ),
                    net: formatMoneyAmount(
                      previewCurrency,
                      String(preview.netAmount),
                      i18n.language
                    ),
                  })
                : t("settings.billing.previewExclusive", {
                    label: label.trim() || "VAT",
                    rate: String(ratePercent),
                    net: formatMoneyAmount(
                      previewCurrency,
                      String(preview.netAmount),
                      i18n.language
                    ),
                    tax: formatMoneyAmount(
                      previewCurrency,
                      String(preview.taxAmount),
                      i18n.language
                    ),
                    gross: formatMoneyAmount(
                      previewCurrency,
                      String(preview.grossAmount),
                      i18n.language
                    ),
                  })}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={putMut.isPending}>
            {putMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {putMut.isPending
              ? t("settings.billing.saving")
              : t("settings.billing.save")}
          </Button>
        </div>
      </form>
    </section>
  );
}
