/** Values for server-side audit log filters (GET /audit-log); extend as backend adds actions. */
export const AUDIT_FILTER_ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
] as const;

export type AuditFilterAction = (typeof AUDIT_FILTER_ACTIONS)[number];

export const AUDIT_FILTER_ENTITY_TYPES = [
  "booking",
  "guest",
  "property",
  "user",
  "room",
  "rate_plan",
  "folio",
  "payment",
] as const;

export type AuditFilterEntityType =
  (typeof AUDIT_FILTER_ENTITY_TYPES)[number];
