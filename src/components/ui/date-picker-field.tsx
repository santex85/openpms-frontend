import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatIsoDateLocal, parseIsoDateLocal } from "@/utils/boardDates";

export interface DatePickerFieldProps {
  id?: string;
  /** Passed to the trigger control for accessibility. */
  "aria-label"?: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** Inclusive min (YYYY-MM-DD). */
  min?: string;
  /** Inclusive max (YYYY-MM-DD). */
  max?: string;
  className?: string;
  /** Shown when `value` is empty. */
  placeholder?: string;
}

export function DatePickerField({
  id,
  "aria-label": ariaLabel,
  value,
  onChange,
  disabled,
  min,
  max,
  className,
  placeholder = "Выберите дату",
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => new Date());
  const trimmed = value.trim();
  const selected =
    trimmed !== "" ? parseIsoDateLocal(trimmed) : undefined;

  useEffect(() => {
    if (open) {
      setMonth(trimmed !== "" ? parseIsoDateLocal(trimmed) : new Date());
    }
  }, [open, trimmed]);

  const display =
    selected !== undefined
      ? format(selected, "dd.MM.yyyy", { locale: ru })
      : placeholder;

  const disabledDays: Matcher[] = [];
  if (min?.trim()) {
    disabledDays.push({ before: parseIsoDateLocal(min.trim()) });
  }
  if (max?.trim()) {
    disabledDays.push({ after: parseIsoDateLocal(max.trim()) });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal md:text-sm",
            selected === undefined && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" aria-hidden />
          <span className="tabular-nums">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border-border p-0" align="start">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(formatIsoDateLocal(d));
              setOpen(false);
            }
          }}
          disabled={disabledDays.length > 0 ? disabledDays : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
