import { FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseMutationResult } from "@tanstack/react-query";

import type { BulkRatesPutRequest, BulkRatesPutResponse } from "@/types/rates";
import type { RoomType } from "@/types/room-types";

export interface RatesBulkEditorProps {
  canWriteRates: boolean;
  roomTypes: RoomType[] | undefined;
  bulkRoomTypeId: string;
  onBulkRoomTypeIdChange: (id: string) => void;
  bulkStart: string;
  onBulkStartChange: (v: string) => void;
  bulkEnd: string;
  onBulkEndChange: (v: string) => void;
  bulkPrice: string;
  onBulkPriceChange: (v: string) => void;
  bulkStopSell: boolean;
  onBulkStopSellChange: (v: boolean) => void;
  bulkMinStay: string;
  onBulkMinStayChange: (v: string) => void;
  bulkMaxStay: string;
  onBulkMaxStayChange: (v: string) => void;
  bulkError: string | null;
  bulkMessage: string | null;
  bulkMutation: UseMutationResult<
    BulkRatesPutResponse,
    unknown,
    BulkRatesPutRequest
  >;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export function RatesBulkEditor({
  canWriteRates,
  roomTypes,
  bulkRoomTypeId,
  onBulkRoomTypeIdChange,
  bulkStart,
  onBulkStartChange,
  bulkEnd,
  onBulkEndChange,
  bulkPrice,
  onBulkPriceChange,
  bulkStopSell,
  onBulkStopSellChange,
  bulkMinStay,
  onBulkMinStayChange,
  bulkMaxStay,
  onBulkMaxStayChange,
  bulkError,
  bulkMessage,
  bulkMutation,
  onSubmit,
}: RatesBulkEditorProps) {
  const { t } = useTranslation();

  if (!canWriteRates) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("rates.readOnlyPrices")}
      </p>
    );
  }

  return (
    <form
      className="max-w-xl space-y-3 rounded-md border border-dashed bg-muted/20 p-3"
      onSubmit={(e) => {
        onSubmit(e);
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        <span>{t("rates.bulkTitle")}</span>
        <span title={t("rates.bulkLockTitle")}>
          <Lock
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </span>
      </div>
      {bulkError !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {bulkError}
        </p>
      ) : null}
      {bulkMessage !== null ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {bulkMessage}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium">{t("rates.category")}</span>
          <Select value={bulkRoomTypeId} onValueChange={onBulkRoomTypeIdChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("rates.roomTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {roomTypes?.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="bulk-start" className="text-xs font-medium">
            {t("rates.dateFrom")}
          </label>
          <DatePickerField
            id="bulk-start"
            value={bulkStart}
            onChange={onBulkStartChange}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bulk-end" className="text-xs font-medium">
            {t("rates.dateTo")}
          </label>
          <DatePickerField
            id="bulk-end"
            value={bulkEnd}
            onChange={onBulkEndChange}
            min={bulkStart.trim() || undefined}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bulk-price" className="text-xs font-medium">
            {t("rates.pricePerNight")}
          </label>
          <Input
            id="bulk-price"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={bulkPrice}
            onChange={(e) => {
              onBulkPriceChange(e.target.value);
            }}
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="bulk-stop-sell"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={bulkStopSell}
            onChange={(e) => {
              onBulkStopSellChange(e.target.checked);
            }}
          />
          <label htmlFor="bulk-stop-sell" className="text-xs font-medium">
            {t("rates.restrictions.stopSell")}
          </label>
        </div>
        <div className="space-y-1">
          <label htmlFor="bulk-min-stay" className="text-xs font-medium">
            {t("rates.restrictions.minStayArrival")}
          </label>
          <Input
            id="bulk-min-stay"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="—"
            value={bulkMinStay}
            onChange={(e) => {
              onBulkMinStayChange(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bulk-max-stay" className="text-xs font-medium">
            {t("rates.restrictions.maxStay")}
          </label>
          <Input
            id="bulk-max-stay"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="—"
            value={bulkMaxStay}
            onChange={(e) => {
              onBulkMaxStayChange(e.target.value);
            }}
          />
        </div>
      </div>
      <Button type="submit" disabled={bulkMutation.isPending}>
        {bulkMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {bulkMutation.isPending ? t("rates.saving") : t("rates.applyBulk")}
      </Button>
    </form>
  );
}
