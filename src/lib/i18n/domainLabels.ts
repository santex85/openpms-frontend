/** Russian labels for domain enum values from the API (snake_case). */

const BOOKING_STATUS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  checked_in: "Заселён",
  checked_out: "Выселен",
  cancelled: "Отменена",
  no_show: "Не заехал",
};

const ROOM_STATUS: Record<string, string> = {
  available: "Доступен",
  maintenance: "Обслуживание",
  out_of_order: "Не продаётся",
};

const HOUSEKEEPING_STATUS: Record<string, string> = {
  clean: "Чистый",
  dirty: "Грязный",
  inspected: "Проверен",
  in_progress: "Уборка",
  out_of_service: "Не в работе",
};

const HOUSEKEEPING_PRIORITY: Record<string, string> = {
  normal: "Обычный",
  high: "Высокий",
  low: "Низкий",
  urgent: "Срочно",
};

const FOLIO_KIND: Record<string, string> = {
  room_charge: "Проживание",
  service: "Услуга",
  adjustment: "Корректировка",
  payment: "Оплата",
  refund: "Возврат",
  discount: "Скидка",
};

export function bookingStatusLabel(status: string): string {
  const k = status.trim().toLowerCase();
  return BOOKING_STATUS[k] ?? status;
}

export function roomStatusLabel(status: string): string {
  const k = status.trim().toLowerCase();
  return ROOM_STATUS[k] ?? status;
}

export function housekeepingStatusLabel(status: string): string {
  const k = status.trim().toLowerCase();
  return HOUSEKEEPING_STATUS[k] ?? status;
}

export function housekeepingPriorityLabel(priority: string): string {
  const k = priority.trim().toLowerCase();
  return HOUSEKEEPING_PRIORITY[k] ?? priority;
}

export function folioKindLabel(kind: string): string {
  const k = kind.trim().toLowerCase();
  return FOLIO_KIND[k] ?? kind;
}

/** Folio ledger transaction_type from API */
const FOLIO_TX: Record<string, string> = {
  charge: "Начисление",
  payment: "Оплата",
  adjustment: "Корректировка",
  void: "Сторно",
  refund: "Возврат",
};

export function folioTransactionTypeLabel(transactionType: string): string {
  const k = transactionType.trim().toLowerCase();
  return FOLIO_TX[k] ?? folioKindLabel(transactionType);
}

const TENANT_ROLE: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  receptionist: "Администратор стойки",
  housekeeping: "Housekeeping",
  viewer: "Наблюдатель",
};

export function tenantUserRoleLabel(role: string): string {
  const k = role.trim().toLowerCase();
  return TENANT_ROLE[k] ?? role;
}
