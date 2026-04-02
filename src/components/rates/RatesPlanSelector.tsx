import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

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

import { monthTitleRu, NEW_RATE_PLAN_SELECT_VALUE } from "./ratesPageHelpers";

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
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-foreground">Сетка тарифов</h3>
        <Select
          value={ratesPeriod}
          onValueChange={(v) => {
            onRatesPeriodChange(v as "month" | "week");
          }}
        >
          <SelectTrigger className="w-[140px]" aria-label="Период сетки">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="week">Неделя</SelectItem>
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
            ratesPeriod === "month" ? "Предыдущий месяц" : "Предыдущая неделя"
          }
          onClick={onPrevPeriod}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[12rem] text-center text-sm tabular-nums text-foreground capitalize">
          {ratesPeriod === "month"
            ? monthTitleRu(monthAnchor)
            : `${rangeStartIso} — ${rangeEndIso}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={
            ratesPeriod === "month" ? "Следующий месяц" : "Следующая неделя"
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
  return (
    <div className="max-w-xl space-y-2">
      <span className="text-sm font-medium">Тарифный план</span>
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
              <SelectValue placeholder="BAR / пакет" />
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
                    + Добавить новый тариф
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
              Редактировать
            </Button>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Удалить тарифный план"
              onClick={onDeleteRatePlan}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
          </>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Сетка показывает все категории номеров для выбранного плана. Во второй
        строке ячейки — остатки из инвентаря (не зависят от тарифа).
        {canWriteRates ? (
          <>
            {" "}
            Клик по ячейке с ценой открывает правку на одну ночь (owner /
            manager).
          </>
        ) : null}
      </p>
    </div>
  );
}
