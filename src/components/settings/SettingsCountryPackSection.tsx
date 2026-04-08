import axios from "axios";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

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
import { usePropertyLockStatus } from "@/hooks/usePropertyLockStatus";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { countryPackFlagEmoji } from "@/lib/countryPackFlags";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";
import { usePropertyStore } from "@/stores/property-store";

const NONE_VALUE = "__none__";

export function SettingsCountryPackSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const canManage = useCanManageProperties();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: properties } = useProperties();
  const { data: lockStatus } = usePropertyLockStatus(selectedPropertyId);
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

  const isLocked = lockStatus?.country_pack_locked === true;
  const bookingCount = lockStatus?.booking_count ?? 0;

  const canApply =
    !isLocked &&
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
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        void queryClient.invalidateQueries({
          queryKey: ["property-lock-status", authKey],
          exact: false,
        });
      }
      toastError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <section
        id="country-pack"
        className="space-y-2 rounded-lg border border-border bg-card p-4"
      >
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
      <section
        id="country-pack"
        className="space-y-2 rounded-lg border border-border bg-card p-4"
      >
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
    <section
      id="country-pack"
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("countryPack.sectionTitle")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("countryPack.intro")}</span>
          <span className="text-amber-800 dark:text-amber-200/90">
            {t("countryPack.onboardingHint")}
          </span>
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
          {isLocked ? (
            <div
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50"
              role="status"
            >
              <Lock
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
                aria-hidden
              />
              <div className="space-y-1">
                <p className="font-medium">{t("countryPack.locked.title")}</p>
                <p>{t("countryPack.locked.description", { count: bookingCount })}</p>
                <p className="text-amber-900/90 dark:text-amber-100/90">
                  {t("countryPack.locked.support")}
                </p>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <span className="text-sm font-medium">
              {t("countryPack.selectorLabel")}
            </span>
            <Select
              value={selectValue}
              disabled={isLocked}
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
                  <SelectItem key={p.code} value={p.code}>
                    {countryPackFlagEmoji(p.code)} {p.name} — {p.currency_code}
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

          {isLocked ? null : (
            <Button
              type="button"
              disabled={!canApply || applyMutation.isPending}
              onClick={() => {
                setConfirmOpen(true);
              }}
            >
              {t("countryPack.apply")}
            </Button>
          )}
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
