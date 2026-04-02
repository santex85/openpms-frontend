/** Колонки канбана по ТЗ: dirty / clean / inspected / out_of_service */
export type HousekeepingStatus =
  | "dirty"
  | "clean"
  | "inspected"
  | "out_of_service";

/** Все колонки по порядку отображения */
export const HOUSEKEEPING_COLUMN_STATUSES: readonly HousekeepingStatus[] = [
  "dirty",
  "clean",
  "inspected",
  "out_of_service",
] as const;

/** Легаси-значения с бэка → нормализация для UI */
const LEGACY_STATUS_MAP: Record<string, HousekeepingStatus> = {
  cleaning: "clean",
  inspected: "inspected",
  dirty: "dirty",
  clean: "clean",
  out_of_service: "out_of_service",
};

export function normalizeHousekeepingStatus(
  raw: string
): HousekeepingStatus {
  const s = raw.trim().toLowerCase();
  const hit = LEGACY_STATUS_MAP[s];
  if (hit !== undefined) {
    return hit;
  }
  if (HOUSEKEEPING_COLUMN_STATUSES.includes(s as HousekeepingStatus)) {
    return s as HousekeepingStatus;
  }
  return "dirty";
}

export interface HousekeepingRoomCard {
  id: string;
  room_id: string;
  /** Подпись в карточке (номер или имя комнаты). */
  label: string;
  status: HousekeepingStatus;
  /** Опционально: примечание от API. */
  notes?: string | null;
  /** Если бэкенд отдаёт название категории. */
  room_type_name?: string | null;
  /** Если бэкенд отдаёт гостя (иная схема — поле опционально). */
  guest_name?: string | null;
}

export interface HousekeepingListResponse {
  items: HousekeepingRoomCard[];
  /** Опционально, если бэк отдаёт дату снимка. */
  date?: string;
}
