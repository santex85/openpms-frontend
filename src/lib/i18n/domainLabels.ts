import { BOOKING_STATUS_OPTIONS, type BookingStatusValue } from "@/lib/constants";
import i18n from "@/i18n";

function normToken(s: string): string {
  return s.trim().toLowerCase().replace(/-/g, "_");
}

export function bookingStatusLabel(status: string): string {
  const k = normToken(status);
  return i18n.t(`booking.status.${k}`, { defaultValue: status });
}

/** Label inside compact summary badges (pending → «Ожидание» per UI spec). */
export function bookingSummaryBadgeLabel(status: string): string {
  const k = normToken(status);
  if (k === "pending") {
    return i18n.t("booking.badge.pending");
  }
  return bookingStatusLabel(status);
}

export function bookingStatusFilterItems(): {
  value: BookingStatusValue;
  label: string;
}[] {
  return BOOKING_STATUS_OPTIONS.map((v) => ({
    value: v,
    label: bookingStatusLabel(v),
  }));
}

export function bookingSourceLabel(source: string | null | undefined): string {
  if (source === null || source === undefined) {
    return "—";
  }
  const s = source.trim();
  if (s === "") {
    return "—";
  }
  const k = normToken(s);
  return i18n.t(`booking.source.${k}`, { defaultValue: s });
}

/** Tailwind classes for booking tiles (board / legend). */
/** Compact badge for booking summary modals (light semantic backgrounds). */
export function bookingSummaryStatusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "pending") {
    return "border border-border bg-muted text-foreground";
  }
  if (s === "confirmed") {
    return "border border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100";
  }
  if (s === "checked_in" || s === "checked-in") {
    return "border border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100";
  }
  if (
    s === "checked_out" ||
    s === "checked-out" ||
    s === "checkedout"
  ) {
    return "border border-border bg-muted/90 text-muted-foreground";
  }
  if (s === "cancelled" || s === "canceled") {
    return "border border-red-300 bg-red-100 text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100";
  }
  if (s === "no_show" || s === "no-show") {
    return "border border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100";
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

export function housekeepingStatusLabel(raw: string): string {
  const k = normToken(raw);
  return i18n.t(`hk.status.${k}`, { defaultValue: raw });
}

export function housekeepingPriorityLabel(raw: string): string {
  const k = normToken(raw);
  return i18n.t(`hk.priority.${k}`, { defaultValue: raw });
}

export function roomStatusLabel(status: string): string {
  const k = normToken(status);
  return i18n.t(`room.status.${k}`, { defaultValue: status });
}

export function folioTransactionTypeLabel(tx: string): string {
  const k = normToken(tx);
  return i18n.t(`folio.tx.${k}`, { defaultValue: tx });
}

export function tenantRoleLabel(role: string): string {
  const k = normToken(role);
  return i18n.t(`role.${k}`, { defaultValue: role });
}

/** Localized display name for room type; falls back to API `name`. */
export function roomTypeDisplayName(name: string | null | undefined): string {
  if (name === null || name === undefined) {
    return "";
  }
  const t = name.trim();
  if (t === "") {
    return "";
  }
  const k = normToken(name.replace(/\s+/gu, "_"));
  return i18n.t(`roomType.${k}`, { defaultValue: name });
}

function auditNormKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\./gu, "_")
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

export function auditActionLabel(action: string): string {
  const k = auditNormKey(action);
  return i18n.t(`audit.action.${k}`, { defaultValue: action });
}

export function auditEntityLabel(entity: string): string {
  const k = auditNormKey(entity);
  return i18n.t(`audit.entity.${k}`, { defaultValue: entity });
}

export function webhookEventLabel(eventId: string): string {
  const k = eventId.trim().toLowerCase().replace(/\./gu, "_");
  return i18n.t(`webhook.event.${k}`, { defaultValue: eventId });
}
