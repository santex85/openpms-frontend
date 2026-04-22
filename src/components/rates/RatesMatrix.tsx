import { Info } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatMoneyAmount } from "@/lib/formatMoney";
import { roomTypeDisplayName } from "@/lib/i18n/domainLabels";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/formatApiError";
import type { NightlyRatesMatrixRow } from "@/hooks/useNightlyRatesMatrix";
import type { BulkRateSegment, RateRead } from "@/types/rates";
import type { RoomType } from "@/types/room-types";
import type { AvailabilityCell } from "@/types/inventory";
import {
  boardLocaleFromI18n,
  type MonthDayMeta,
} from "@/utils/boardDates";

import { availabilityOccupancyLine } from "./ratesPageHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function selectionKey(roomTypeId: string, dateIso: string): string {
  return `${roomTypeId}\t${dateIso}`;
}

function expandRectangle(
  roomTypes: RoomType[],
  rangeDays: MonthDayMeta[],
  r0: number,
  d0: number,
  r1: number,
  d1: number
): Set<string> {
  const ri0 = Math.min(r0, r1);
  const ri1 = Math.max(r0, r1);
  const di0 = Math.min(d0, d1);
  const di1 = Math.max(d0, d1);
  const next = new Set<string>();
  for (let ri = ri0; ri <= ri1; ri++) {
    const rt = roomTypes[ri];
    if (rt === undefined) {
      continue;
    }
    for (let di = di0; di <= di1; di++) {
      const day = rangeDays[di];
      if (day === undefined) {
        continue;
      }
      next.add(selectionKey(rt.id, day.iso));
    }
  }
  return next;
}

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
    stopSell: boolean;
    minStayArrivalDraft: string;
    maxStayDraft: string;
  }) => void;
  /** When set, drag-selecting 2+ cells shows an inline bulk price bar (PUT /rates/bulk). */
  onMatrixBulkApply?: (segments: BulkRateSegment[]) => Promise<void>;
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
  onMatrixBulkApply,
}: RatesMatrixProps) {
  const { t, i18n } = useTranslation();
  const loc = boardLocaleFromI18n(i18n.language);

  const [dragSelection, setDragSelection] = useState<Set<string>>(
    () => new Set()
  );
  const dragAnchorRef = useRef<{ r: number; d: number } | null>(null);
  const movedMultiRef = useRef(false);
  const [matrixBulkPrice, setMatrixBulkPrice] = useState("");
  const [matrixBulkErr, setMatrixBulkErr] = useState<string | null>(null);
  const [matrixBulkPending, setMatrixBulkPending] = useState(false);

  const clearDragSelection = useCallback(() => {
    setDragSelection(new Set());
    setMatrixBulkErr(null);
    dragAnchorRef.current = null;
    movedMultiRef.current = false;
  }, []);

  useEffect(() => {
    function onUp(): void {
      dragAnchorRef.current = null;
    }
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    function onKey(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        clearDragSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [clearDragSelection]);

  async function submitMatrixBulk(): Promise<void> {
    if (onMatrixBulkApply === undefined || ratePlanId === "") {
      return;
    }
    setMatrixBulkErr(null);
    const trimmed = matrixBulkPrice.trim().replace(",", ".");
    if (
      trimmed === "" ||
      Number.isNaN(Number(trimmed)) ||
      Number(trimmed) < 0
    ) {
      setMatrixBulkErr(t("rates.err.priceNonNegative"));
      return;
    }
    const segments: BulkRateSegment[] = [];
    for (const key of dragSelection) {
      const [roomTypeId, dateIso] = key.split("\t");
      if (roomTypeId === undefined || dateIso === undefined) {
        continue;
      }
      segments.push({
        room_type_id: roomTypeId,
        rate_plan_id: ratePlanId,
        start_date: dateIso,
        end_date: dateIso,
        price: trimmed,
      });
    }
    if (segments.length === 0) {
      return;
    }
    setMatrixBulkPending(true);
    try {
      await onMatrixBulkApply(segments);
      clearDragSelection();
      setMatrixBulkPrice("");
    } catch (err) {
      setMatrixBulkErr(formatApiError(err));
    } finally {
      setMatrixBulkPending(false);
    }
  }

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
        <div className="space-y-2">
          {onMatrixBulkApply !== undefined ? (
            <p className="text-xs text-muted-foreground">
              {t("rates.matrix.dragSelectHint")}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-xs select-none">
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
              {roomTypes?.map((rt, ri) => {
                const row = matrixRows.find((r) => r.roomTypeId === rt.id);
                const priceByDate = new Map<string, string>();
                const rateRowByDate = new Map<string, RateRead>();
                if (row?.data !== undefined) {
                  for (const rate of row.data) {
                    priceByDate.set(rate.date, rate.price);
                    rateRowByDate.set(rate.date, rate);
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
                    {rangeDays.map((d, di) => {
                      const p = priceByDate.get(d.iso);
                      const availKey = `${d.iso}_${rt.id}`;
                      const availCell = availabilityByKey.get(availKey);
                      const cellKey = selectionKey(rt.id, d.iso);
                      const isDragSelected = dragSelection.has(cellKey);
                      function openCellEditor(): void {
                        if (!cellEditable) return;
                        clearDragSelection();
                        const rateRow = rateRowByDate.get(d.iso);
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
                          stopSell: rateRow?.stop_sell ?? false,
                          minStayArrivalDraft:
                            rateRow?.min_stay_arrival != null
                              ? String(rateRow.min_stay_arrival)
                              : "",
                          maxStayDraft:
                            rateRow?.max_stay != null
                              ? String(rateRow.max_stay)
                              : "",
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
                            "border-b border-border/80 px-0.5 py-1.5 align-top text-center tabular-nums text-foreground md:py-2",
                            rowPending && "animate-pulse bg-muted/30",
                            d.iso === todayIso && "bg-primary/5",
                            isDragSelected &&
                              "bg-primary/20 ring-1 ring-inset ring-primary/40",
                            cellEditable &&
                              "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          )}
                          onMouseDown={(e) => {
                            if (
                              !cellEditable ||
                              e.button !== 0 ||
                              roomTypes === undefined ||
                              onMatrixBulkApply === undefined
                            ) {
                              return;
                            }
                            e.preventDefault();
                            movedMultiRef.current = false;
                            dragAnchorRef.current = { r: ri, d: di };
                            setDragSelection(
                              expandRectangle(roomTypes, rangeDays, ri, di, ri, di)
                            );
                          }}
                          onMouseEnter={(e) => {
                            const a = dragAnchorRef.current;
                            if (
                              a === null ||
                              roomTypes === undefined ||
                              e.buttons !== 1 ||
                              onMatrixBulkApply === undefined
                            ) {
                              return;
                            }
                            if (a.r !== ri || a.d !== di) {
                              movedMultiRef.current = true;
                            }
                            setDragSelection(
                              expandRectangle(roomTypes, rangeDays, a.r, a.d, ri, di)
                            );
                          }}
                          onClick={(ev) => {
                            if (movedMultiRef.current) {
                              ev.preventDefault();
                              ev.stopPropagation();
                              movedMultiRef.current = false;
                              return;
                            }
                            openCellEditor();
                          }}
                          onKeyDown={(ev) => {
                            if (!cellEditable) return;
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              openCellEditor();
                            }
                          }}
                        >
                          <div className="flex min-h-[2.25rem] flex-col items-center justify-center gap-0.5 leading-tight md:min-h-[3.5rem]">
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
                              className="flex max-w-[4rem] items-start justify-center gap-0.5 text-[11px] leading-tight text-muted-foreground"
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
          {onMatrixBulkApply !== undefined &&
          dragSelection.size >= 2 &&
          canWriteRates ? (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 sm:flex-row sm:flex-wrap sm:items-end">
              <p className="text-sm font-medium text-foreground">
                {t("rates.matrix.selectionCount", {
                  count: dragSelection.size,
                })}
              </p>
              <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
                <label htmlFor="matrix-bulk-price" className="text-xs text-muted-foreground">
                  {t("rates.matrix.bulkPriceLabel")}
                </label>
                <Input
                  id="matrix-bulk-price"
                  value={matrixBulkPrice}
                  onChange={(ev) => {
                    setMatrixBulkPrice(ev.target.value);
                  }}
                  placeholder="0.00"
                  autoComplete="off"
                />
              </div>
              {matrixBulkErr !== null ? (
                <p className="w-full text-sm text-destructive" role="alert">
                  {matrixBulkErr}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={matrixBulkPending}
                  onClick={() => {
                    void submitMatrixBulk();
                  }}
                >
                  {t("rates.matrix.applyDragBulk")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearDragSelection();
                    setMatrixBulkPrice("");
                  }}
                >
                  {t("rates.matrix.clearSelection")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
