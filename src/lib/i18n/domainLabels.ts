import { BOOKING_STATUS_OPTIONS, type BookingStatusValue } from "@/lib/constants";

const BOOKING_STATUS_RU: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  checked_in: "Заезд",
  checked_out: "Выезд",
  cancelled: "Отменена",
  no_show: "Не заезд",
};

export function bookingStatusLabel(status: string): string {
  const k = status.trim().toLowerCase();
  return BOOKING_STATUS_RU[k] ?? status;
}

/** Label inside compact summary badges (pending → «Ожидание» per UI spec). */
export function bookingSummaryBadgeLabel(status: string): string {
  const k = status.trim().toLowerCase();
  if (k === "pending") {
    return "Ожидание";
  }
  return bookingStatusLabel(status);
}

export function bookingStatusFilterItems(): { value: BookingStatusValue; label: string }[] {
  return BOOKING_STATUS_OPTIONS.map((v) => ({
    value: v,
    label: bookingStatusLabel(v),
  }));
}

const BOOKING_SOURCE_RU: Record<string, string> = {
  direct: "Прямое бронирование",
  ota: "ОТА",
  phone: "Телефон",
  walk_in: "Walk-in",
  website: "Сайт",
  email: "E-mail",
};

export function bookingSourceLabel(source: string | null | undefined): string {
  if (source === null || source === undefined) {
    return "—";
  }
  const s = source.trim();
  if (s === "") {
    return "—";
  }
  const k = s.toLowerCase();
  return BOOKING_SOURCE_RU[k] ?? s;
}

/** Tailwind classes for booking tiles (board / legend). */
/** Compact badge for booking summary modals (light semantic backgrounds). */
export function bookingSummaryStatusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "pending") {
    return "border border-border bg-muted text-foreground";
  }
  if (s === "confirmed") {
    return "border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100";
  }
  if (s === "checked_in" || s === "checked-in") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100";
  }
  if (
    s === "checked_out" ||
    s === "checked-out" ||
    s === "checkedout"
  ) {
    return "border border-border bg-muted/90 text-muted-foreground";
  }
  if (s === "cancelled" || s === "canceled") {
    return "border border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100";
  }
  if (s === "no_show" || s === "no-show") {
    return "border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100";
  }
  return "border border-border bg-muted text-foreground";
}

export function bookingStatusTileClasses(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "confirmed") {
    return "border-blue-700 bg-blue-600/90 text-white";
  }
  if (s === "checked_in" || s === "checked-in") {
    return "border-emerald-700 bg-emerald-600/90 text-white";
  }
  if (
    s === "checked_out" ||
    s === "checked-out" ||
    s === "checkedout"
  ) {
    return "border-violet-800 bg-violet-700/90 text-white";
  }
  if (s === "cancelled" || s === "canceled") {
    return "border-border bg-muted/90 text-muted-foreground line-through";
  }
  if (s === "tentative" || s === "hold") {
    return "border-amber-700 bg-amber-500/90 text-white";
  }
  if (s === "no_show" || s === "no-show") {
    return "border-rose-800 bg-rose-700/90 text-white";
  }
  if (s === "pending") {
    return "border-slate-600 bg-slate-500/90 text-white";
  }
  return "border-slate-600 bg-slate-600/90 text-white";
}

/** Solid background for legend square (no border/text). */
export function bookingStatusLegendSwatchClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "confirmed") return "bg-blue-600";
  if (s === "checked_in" || s === "checked-in") return "bg-emerald-600";
  if (
    s === "checked_out" ||
    s === "checked-out" ||
    s === "checkedout"
  ) {
    return "bg-violet-700";
  }
  if (s === "cancelled" || s === "canceled") return "bg-muted-foreground/40";
  if (s === "tentative" || s === "hold") return "bg-amber-500";
  if (s === "no_show" || s === "no-show") return "bg-rose-700";
  if (s === "pending") return "bg-slate-500";
  return "bg-slate-600";
}

export const BOARD_LEGEND_STATUSES: readonly string[] = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
];

const HK_STATUS_RU: Record<string, string> = {
  dirty: "Грязный",
  clean: "Чистый",
  inspected: "Проверен",
  out_of_service: "Не в работе",
  cleaning: "Уборка",
};

export function housekeepingStatusLabel(raw: string): string {
  const k = raw.trim().toLowerCase();
  return HK_STATUS_RU[k] ?? raw;
}

const ROOM_STATUS_RU: Record<string, string> = {
  available: "Доступен",
  maintenance: "Обслуживание",
  out_of_order: "Не продаётся",
};

export function roomStatusLabel(status: string): string {
  const k = status.trim().toLowerCase();
  return ROOM_STATUS_RU[k] ?? status;
}

const FOLIO_TX_RU: Record<string, string> = {
  charge: "Начисление",
  payment: "Оплата",
  refund: "Возврат",
  adjustment: "Корректировка",
};

export function folioTransactionTypeLabel(t: string): string {
  const k = t.trim().toLowerCase();
  return FOLIO_TX_RU[k] ?? t;
}

const ROLE_RU: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  receptionist: "Рецепция",
  housekeeping: "Горничные",
  viewer: "Наблюдатель",
};

export function tenantRoleLabel(role: string): string {
  const k = role.trim().toLowerCase();
  return ROLE_RU[k] ?? role;
}
