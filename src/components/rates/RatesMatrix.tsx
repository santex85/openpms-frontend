import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatMoneyAmount } from "@/lib/formatMoney";
import { roomTypeDisplayName } from "@/lib/i18n/domainLabels";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/formatApiError";
import type { NightlyRatesMatrixRow } from "@/hooks/useNightlyRatesMatrix";
import type { RoomType } from "@/types/room-types";
import type { AvailabilityCell } from "@/types/inventory";
import {
  boardLocaleFromI18n,
  type MonthDayMeta,
} from "@/utils/boardDates";

import { availabilityOccupancyLine } from "./ratesPageHelpers";

export interface RatesMatrixProps {
  roomTypes: RoomType[] | undefined;
  matrixRows: NightlyRatesMatrixRow[];
  rangeDays: MonthDayMeta[];
  todayIso: string;
  ratesError: boolean;
  ratesErrorObj: Error | null;
  availabilityError: boolean;
  availabilityErrorObj: Error | null;
  availabilityPending: boolean;
  availabilityByKey: Map<string, AvailabilityCell>;
  allRatesStillPending: boolean;
  skeletonMinHeightRem: number;
  canWriteRates: boolean;
  selectedPropertyId: string | null;
  ratePlanId: string;
  /** ISO 4217; when set, matrix cells show formatted money. */
  propertyCurrency: string | null;
  onOpenCellEdit: (payload: {
    roomTypeId: string;
    roomTypeName: string;
    dateIso: string;
    dateLabel: string;
    priceDraft: string;
  }) => void;
}

export function RatesMatrix({
  roomTypes,
  matrixRows,
  rangeDays,
  todayIso,
  ratesError,
  ratesErrorObj,
  availabilityError,
  availabilityErrorObj,
  availabilityPending,
  availabilityByKey,
  allRatesStillPending,
  skeletonMinHeightRem,
  canWriteRates,
  selectedPropertyId,
  ratePlanId,
  propertyCurrency,
  onOpenCellEdit,
}: RatesMatrixProps) {
  const { t, i18n } = useTranslation();
  const loc = boardLocaleFromI18n(i18n.language);
  return (
    <>
      {ratesError && ratesErrorObj !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(ratesErrorObj)}
        </p>
      ) : null}

      {availabilityError && availabilityErrorObj !== null ? (
        <p
          className="text-sm text-amber-700 dark:text-amber-400"
          role="status"
        >
          {t("rates.matrix.inventoryLoadFailed")}{" "}
          {formatApiError(availabilityErrorObj)}
        </p>
      ) : null}

      {allRatesStillPending ? (
        <div
          className="min-h-28 animate-pulse rounded-md bg-muted"
          style={{ minHeight: `${String(skeletonMinHeightRem)}rem` }}
          aria-hidden
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[8.5rem] border-b border-r bg-muted/40 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t("rates.category")}
                </th>
                {rangeDays.map((d) => {
                  const weekday = d.date.toLocaleDateString(loc, {
                    weekday: "short",
                  });
                  return (
                    <th
                      key={d.iso}
                      className={cn(
                        "min-w-[3.25rem] border-b bg-muted/40 px-0.5 py-2 text-center font-medium leading-tight text-foreground",
                        d.iso === todayIso &&
                          "bg-primary/15 ring-1 ring-inset ring-primary/35"
                      )}
                    >
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {weekday}
                      </div>
                      <div className="tabular-nums">{d.date.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {roomTypes?.map((rt) => {
                const row = matrixRows.find((r) => r.roomTypeId === rt.id);
                const priceByDate = new Map<string, string>();
                if (row?.data !== undefined) {
                  for (const rate of row.data) {
                    priceByDate.set(rate.date, rate.price);
                  }
                }
                const rowPending = row?.isPending ?? true;
                const cellEditable =
                  canWriteRates &&
                  selectedPropertyId !== null &&
                  ratePlanId !== "" &&
                  !rowPending;
                return (
                  <tr key={rt.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r bg-card px-2 py-2 text-left font-medium text-foreground"
                    >
                      {roomTypeDisplayName(rt.name)}
                    </th>
                    {rangeDays.map((d) => {
                      const p = priceByDate.get(d.iso);
                      const availKey = `${d.iso}_${rt.id}`;
                      const availCell = availabilityByKey.get(availKey);
                      function openCellEditor(): void {
                        if (!cellEditable) return;
                        onOpenCellEdit({
                          roomTypeId: rt.id,
                          roomTypeName: roomTypeDisplayName(rt.name),
                          dateIso: d.iso,
                          dateLabel: d.date.toLocaleDateString(loc, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }),
                          priceDraft: p ?? "",
                        });
                      }
                      return (
                        <td
                          key={d.iso}
                          role={cellEditable ? "button" : undefined}
                          tabIndex={cellEditable ? 0 : undefined}
                          title={
                            !rowPending && p === undefined
                              ? t("rates.matrix.noPriceHint")
                              : undefined
                          }
                          className={cn(
                            "border-b border-border/80 px-0.5 py-1.5 align-top text-center tabular-nums text-foreground",
                            rowPending && "animate-pulse bg-muted/30",
                            d.iso === todayIso && "bg-primary/5",
                            cellEditable &&
                              "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          )}
                          onClick={openCellEditor}
                          onKeyDown={(ev) => {
                            if (!cellEditable) return;
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              openCellEditor();
                            }
                          }}
                        >
                          <div className="flex min-h-[2.25rem] flex-col items-center justify-center gap-0.5 leading-tight">
                            <span className="text-sm font-semibold tabular-nums">
                              {rowPending
                                ? "…"
                                : p !== undefined
                                  ? propertyCurrency !== null &&
                                    propertyCurrency.trim() !== ""
                                    ? formatMoneyAmount(
                                        propertyCurrency,
                                        p,
                                        i18n.language
                                      )
                                    : p
                                  : "—"}
                            </span>
                            <div
                              className="flex max-w-[4rem] items-start justify-center gap-0.5 text-[10px] leading-tight text-muted-foreground"
                              title={
                                availCell !== undefined
                                  ? t("rates.matrix.availTitle", {
                                      booked: availCell.booked_rooms,
                                      free: availCell.available_rooms,
                                    })
                                  : undefined
                              }
                            >
                              {!rowPending &&
                              !availabilityError &&
                              !availabilityPending ? (
                                <Info
                                  className="mt-0.5 h-3 w-3 shrink-0 opacity-60"
                                  aria-hidden
                                />
                              ) : null}
                              <span className="line-clamp-2 text-left">
                                {availabilityOccupancyLine(
                                  availCell,
                                  availabilityPending,
                                  availabilityError
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
