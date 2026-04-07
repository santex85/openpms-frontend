import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RatePlanRead } from "@/types/rates";
import {
  boardLocaleFromI18n,
  monthTitleLocale,
} from "@/utils/boardDates";

import { NEW_RATE_PLAN_SELECT_VALUE } from "./ratesPageHelpers";

export interface RatesGridPeriodToolbarProps {
  ratesPeriod: "month" | "week";
  onRatesPeriodChange: (period: "month" | "week") => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  monthAnchor: Date;
  rangeStartIso: string;
  rangeEndIso: string;
}

export function RatesGridPeriodToolbar({
  ratesPeriod,
  onRatesPeriodChange,
  onPrevPeriod,
  onNextPeriod,
  monthAnchor,
  rangeStartIso,
  rangeEndIso,
}: RatesGridPeriodToolbarProps) {
  const { t, i18n } = useTranslation();
  const loc = boardLocaleFromI18n(i18n.language);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("rates.toolbarGrid")}
        </h3>
        <Select
          value={ratesPeriod}
          onValueChange={(v) => {
            onRatesPeriodChange(v as "month" | "week");
          }}
        >
          <SelectTrigger
            className="w-[140px]"
            aria-label={t("rates.aria.gridPeriod")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t("rates.toolbarMonth")}</SelectItem>
            <SelectItem value="week">{t("rates.toolbarWeek")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={
            ratesPeriod === "month"
              ? t("rates.aria.prevMonth")
              : t("rates.aria.prevWeek")
          }
          onClick={onPrevPeriod}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[12rem] text-center text-sm tabular-nums text-foreground capitalize">
          {ratesPeriod === "month"
            ? monthTitleLocale(monthAnchor, loc)
            : `${rangeStartIso} — ${rangeEndIso}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={
            ratesPeriod === "month"
              ? t("rates.aria.nextMonth")
              : t("rates.aria.nextWeek")
          }
          onClick={onNextPeriod}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export interface RatesRatePlanStripProps {
  ratePlans: RatePlanRead[] | undefined;
  ratePlanId: string;
  onRatePlanIdChange: (id: string) => void;
  onRequestNewRatePlan: () => void;
  canWriteRates: boolean;
  onEditRatePlan: () => void;
  onDeleteRatePlan: () => void;
}

export function RatesRatePlanStrip({
  ratePlans,
  ratePlanId,
  onRatePlanIdChange,
  onRequestNewRatePlan,
  canWriteRates,
  onEditRatePlan,
  onDeleteRatePlan,
}: RatesRatePlanStripProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-xl space-y-2">
      <span className="text-sm font-medium">{t("rates.ratePlanLabel")}</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Select
            value={ratePlanId}
            onValueChange={(v) => {
              if (v === NEW_RATE_PLAN_SELECT_VALUE) {
                onRequestNewRatePlan();
                return;
              }
              onRatePlanIdChange(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("rates.ratePlanPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {ratePlans?.map((rp) => (
                <SelectItem key={rp.id} value={rp.id}>
                  {rp.name}
                </SelectItem>
              ))}
              {canWriteRates ? (
                <>
                  <SelectSeparator />
                  <SelectItem
                    value={NEW_RATE_PLAN_SELECT_VALUE}
                    className="text-primary focus:text-primary"
                  >
                    {t("rates.addPlanItem")}
                  </SelectItem>
                </>
              ) : null}
            </SelectContent>
          </Select>
        </div>
        {canWriteRates && ratePlanId !== "" ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={onEditRatePlan}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t("rates.editPlan")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("rates.aria.deletePlan")}
              onClick={onDeleteRatePlan}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("rates.removePlan")}
            </Button>
          </>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("rates.stripHint")}
        {canWriteRates ? t("rates.stripHintWrite") : null}
      </p>
    </div>
  );
}
