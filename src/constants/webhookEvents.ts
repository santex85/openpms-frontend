/** Фиксированный набор событий для multi-select вебхуков (согласовать с бэком). */
export const WEBHOOK_EVENT_OPTIONS = [
  "booking.created",
  "booking.updated",
  "booking.cancelled",
  "guest.created",
  "payment.received",
  "room.status_changed",
  "folio.entry_created",
] as const;

export type WebhookEventId = (typeof WEBHOOK_EVENT_OPTIONS)[number];
