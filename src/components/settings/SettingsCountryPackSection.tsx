import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { CountryPackCard } from "@/components/settings/CountryPackCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCanManageProperties } from "@/hooks/useAuthz";
import {
  useApplyCountryPack,
  useCountryPackDetail,
  useCountryPacksList,
} from "@/hooks/useCountryPacks";
import { useProperties } from "@/hooks/useProperties";
import { countryPackFlagEmoji } from "@/lib/countryPackFlags";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";
import { usePropertyStore } from "@/stores/property-store";

const NONE_VALUE = "__none__";

export function SettingsCountryPackSection() {
  const { t } = useTranslation();
  const canManage = useCanManageProperties();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: properties } = useProperties();
  const { data: packs, isPending: packsPending, isError: packsError } =
    useCountryPacksList();

  const savedCode = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return null;
    }
    return (
      properties.find((p) => p.id === selectedPropertyId)?.country_pack_code ??
      null
    );
  }, [selectedPropertyId, properties]);

  const propertyRow = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return undefined;
    }
    return properties.find((p) => p.id === selectedPropertyId);
  }, [selectedPropertyId, properties]);

  const [draftCode, setDraftCode] = useState<string | null>(null);
  useEffect(() => {
    setDraftCode(savedCode);
  }, [savedCode]);

  const effectiveCode =
    draftCode !== null && draftCode.trim() !== "" ? draftCode : null;
  const selectValue =
    effectiveCode !== null && effectiveCode !== ""
      ? effectiveCode
      : NONE_VALUE;

  const { data: detail } = useCountryPackDetail(effectiveCode);
  const applyMutation = useApplyCountryPack();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canApply =
    canManage &&
    selectedPropertyId !== null &&
    draftCode !== null &&
    draftCode !== NONE_VALUE &&
    draftCode !== (savedCode ?? "");

  async function runApply(): Promise<void> {
    if (draftCode === null || draftCode === NONE_VALUE) {
      return;
    }
    try {
      await applyMutation.mutateAsync(draftCode);
      setConfirmOpen(false);
      toastSuccess(t("countryPack.toastApplied"));
    } catch (err) {
      toastError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("countryPack.sectionTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("countryPack.noPermission")}
        </p>
      </section>
    );
  }

  if (selectedPropertyId === null) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("countryPack.sectionTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("countryPack.pickProperty")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("countryPack.sectionTitle")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("countryPack.intro")}</span>
          <ApiRouteHint>GET /country-packs</ApiRouteHint>
          <ApiRouteHint>
            POST /country-packs/{"{"}code{"}"}/apply
          </ApiRouteHint>
        </p>
      </div>

      {packsError ? (
        <p className="text-sm text-destructive">{t("countryPack.loadError")}</p>
      ) : packsPending ? (
        <div className="h-10 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="max-w-md space-y-3">
          <div className="space-y-2">
            <span className="text-sm font-medium">
              {t("countryPack.selectorLabel")}
            </span>
            <Select
              value={selectValue}
              onValueChange={(v) => {
                setDraftCode(v === NONE_VALUE ? null : v);
              }}
            >
              <SelectTrigger aria-label={t("countryPack.selectorLabel")}>
                <SelectValue placeholder={t("countryPack.notConfigured")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  {t("countryPack.notConfigured")}
                </SelectItem>
                {(packs ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.code}>
                    {countryPackFlagEmoji(p.code)} {p.name} — {p.currency} (
                    {p.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {detail !== undefined && effectiveCode !== null ? (
            <CountryPackCard
              pack={detail}
              propertyTimezone={propertyRow?.timezone}
            />
          ) : null}

          <Button
            type="button"
            disabled={!canApply || applyMutation.isPending}
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            {t("countryPack.apply")}
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("countryPack.confirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("countryPack.confirmBody")}
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={applyMutation.isPending}
              onClick={() => {
                void runApply();
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
