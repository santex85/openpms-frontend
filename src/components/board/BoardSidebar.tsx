import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOARD_LEGEND_STATUSES,
  bookingStatusLabel,
  bookingStatusLegendSwatchClass,
} from "@/lib/i18n/domainLabels";
import {
  type BoardRangeMode,
  getMonthRange,
  shiftMonthAnchor,
} from "@/utils/boardDates";

export interface BoardSidebarProps {
  rangeTitle: string;
  boardRangeMode: BoardRangeMode;
  onBoardRangeModeChange: (mode: BoardRangeMode) => void;
  monthAnchor: Date;
  onMonthAnchorChange: (date: Date) => void;
  customFromIso: string;
  customToIso: string;
  onCustomFromIsoChange: (v: string) => void;
  onCustomToIsoChange: (v: string) => void;
  canWriteBookings: boolean;
}

export function BoardSidebar({
  rangeTitle,
  boardRangeMode,
  onBoardRangeModeChange,
  monthAnchor,
  onMonthAnchorChange,
  customFromIso,
  customToIso,
  onCustomFromIsoChange,
  onCustomToIsoChange,
  canWriteBookings,
}: BoardSidebarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">Сетка</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Остатки в шапке, категории и номера слева. Период:{" "}
          <span className="font-medium text-foreground">{rangeTitle}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-2 text-[11px] text-muted-foreground md:text-xs">
          <span className="font-medium text-foreground">Статусы броней</span>
          {BOARD_LEGEND_STATUSES.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1.5 text-foreground"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${bookingStatusLegendSwatchClass(st)}`}
                aria-hidden
              />
              {bookingStatusLabel(st)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={boardRangeMode}
            onValueChange={(v) => {
              const mode = v as BoardRangeMode;
              onBoardRangeModeChange(mode);
              if (mode === "custom") {
                const m = getMonthRange(monthAnchor);
                onCustomFromIsoChange(m.startIso);
                onCustomToIsoChange(m.endIso);
              }
            }}
          >
            <SelectTrigger className="w-[168px]" aria-label="Тип периода">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="fortnight">2 недели</SelectItem>
              <SelectItem value="custom">Свой диапазон</SelectItem>
            </SelectContent>
          </Select>
          {boardRangeMode === "custom" ? (
            <>
              <Input
                type="date"
                className="w-[150px]"
                value={customFromIso}
                onChange={(e) => {
                  onCustomFromIsoChange(e.target.value);
                }}
                aria-label="Начало периода"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                className="w-[150px]"
                value={customToIso}
                onChange={(e) => {
                  onCustomToIsoChange(e.target.value);
                }}
                aria-label="Конец периода"
              />
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={boardRangeMode === "custom"}
            aria-label="Предыдущий период"
            onClick={() => {
              if (boardRangeMode === "month") {
                onMonthAnchorChange(shiftMonthAnchor(monthAnchor, -1));
              } else if (boardRangeMode === "fortnight") {
                const d = new Date(monthAnchor);
                d.setDate(d.getDate() - 14);
                onMonthAnchorChange(d);
              }
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onMonthAnchorChange(new Date());
            }}
          >
            Сегодня
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={boardRangeMode === "custom"}
            aria-label="Следующий период"
            onClick={() => {
              if (boardRangeMode === "month") {
                onMonthAnchorChange(shiftMonthAnchor(monthAnchor, 1));
              } else if (boardRangeMode === "fortnight") {
                const d = new Date(monthAnchor);
                d.setDate(d.getDate() + 14);
                onMonthAnchorChange(d);
              }
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {canWriteBookings ? (
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link to="/bookings">Новая бронь</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
