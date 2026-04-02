import { ru } from "date-fns/locale";
import { DayPicker, type DayPickerProps } from "react-day-picker";

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  locale = ru,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={locale}
      className={className}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
