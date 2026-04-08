import { Info } from "lucide-react";
import { Fragment, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { BoardBookingMenuApi } from "@/components/board/BookingBlock";
import { BookingBlock } from "@/components/board/BookingBlock";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/api";
import type { MonthDayMeta } from "@/utils/boardDates";

function isNightBooked(laneBookings: Booking[], nightIso: string): boolean {
  return laneBookings.some(
    (b) =>
      b.check_in_date !== null &&
      b.check_out_date !== null &&
      b.check_in_date <= nightIso &&
      b.check_out_date > nightIso
  );
}

interface BoardUnassignedLaneRowProps {
  roomTypeName: string;
  days: MonthDayMeta[];
  innerColTemplate: string;
  laneBookings: Booking[];
  cellBorder: string;
  todayIso: string;
  bookingMenuApi?: BoardBookingMenuApi | null;
}

function BoardUnassignedLaneRowInner({
  roomTypeName,
  days,
  innerColTemplate,
  laneBookings,
  cellBorder,
  todayIso,
  bookingMenuApi,
}: BoardUnassignedLaneRowProps) {
  const { t } = useTranslation();
  const hint = t("board.unassignedLaneHint");
  const hasBookings = laneBookings.length > 0;

  const minHeight = useMemo(() => {
    return laneBookings.length <= 1 ? "min-h-10" : "min-h-[2.75rem]";
  }, [laneBookings.length]);

  const leftTitle = [t("board.unassignedLaneTitle"), roomTypeName].join(" · ");

  return (
    <Fragment>
      <div
        className={cn(
          cellBorder,
          "sticky left-0 z-[21] bg-amber-50 px-2 py-2 pl-4 text-xs shadow-[1px_0_0_0_rgb(0_0_0/0.06)] dark:bg-amber-950 dark:shadow-[1px_0_0_0_rgb(1_1_1/0.08)]"
        )}
        title={hasBookings ? `${leftTitle}. ${hint}` : undefined}
      >
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-amber-950 dark:text-amber-100">
              {t("board.unassignedLaneTitle")}
            </div>
            <div className="mt-0.5 text-[0.65rem] leading-tight text-amber-900/80 dark:text-amber-200/80">
              {roomTypeName}
            </div>
          </div>
          {hasBookings ? (
            <button
              type="button"
              className={cn(
                "-mr-0.5 -mt-0.5 rounded-sm p-0.5 text-amber-800/90 hover:bg-amber-100/80 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-200/90 dark:hover:bg-amber-900/50 dark:hover:text-amber-50"
              )}
              aria-label={hint}
              title={hint}
            >
              <Info className="size-3.5 shrink-0" aria-hidden />
            </button>
          ) : null}
        </div>
        {hasBookings ? (
          <span className="sr-only">{hint}</span>
        ) : (
          <div className="mt-1 text-[0.6rem] text-muted-foreground">{hint}</div>
        )}
      </div>
      <div
        className={cn(
          cellBorder,
          "relative overflow-hidden bg-amber-50/70 dark:bg-amber-950/25",
          minHeight
        )}
        style={{ gridColumn: "2 / -1" }}
      >
        <div
          className={cn("grid", minHeight)}
          style={{ gridTemplateColumns: innerColTemplate }}
        >
          {days.map((day) => {
            const booked = isNightBooked(laneBookings, day.iso);
            return (
              <div
                key={day.iso}
                className={cn(
                  "border-b-0 border-l-0 border-r border-t-0 border-border last:border-r-0",
                  day.iso === todayIso && "bg-primary/5"
                )}
                aria-hidden={!booked}
              >
                {booked ? null : (
                  <span className="sr-only">
                    {t("board.unassignedLaneTitle")} — {day.iso}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0">
          {laneBookings.map((b) => (
            <BookingBlock key={b.id} booking={b} days={days} menuApi={bookingMenuApi} />
          ))}
        </div>
      </div>
    </Fragment>
  );
}

export const BoardUnassignedLaneRow = memo(BoardUnassignedLaneRowInner);
