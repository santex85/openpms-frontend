import { FormEvent } from "react";
import { Loader2 } from "lucide-react";

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
  bulkError,
  bulkMessage,
  bulkMutation,
  onSubmit,
}: RatesBulkEditorProps) {
  if (!canWriteRates) {
    return (
      <p className="text-sm text-muted-foreground">
        Изменение цен доступно ролям owner и manager.
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Массовая цена за период (owner / manager)
      </p>
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
          <span className="text-xs font-medium">Категория</span>
          <Select value={bulkRoomTypeId} onValueChange={onBulkRoomTypeIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Тип номера" />
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
            С
          </label>
          <DatePickerField
            id="bulk-start"
            value={bulkStart}
            onChange={onBulkStartChange}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bulk-end" className="text-xs font-medium">
            По
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
            Цена за ночь
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
      </div>
      <Button type="submit" disabled={bulkMutation.isPending}>
        {bulkMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {bulkMutation.isPending ? "Сохраняем…" : "Применить к диапазону"}
      </Button>
    </form>
  );
}
