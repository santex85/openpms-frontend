/** Статус номера для канбана housekeeping (совпадает с колонками UI). */
export type HousekeepingStatus =
  | "dirty"
  | "cleaning"
  | "clean"
  | "inspected";

export interface HousekeepingRoomCard {
  id: string;
  room_id: string;
  /** Подпись в карточке (номер или имя комнаты). */
  label: string;
  status: HousekeepingStatus;
  /** Опционально: примечание от API. */
  notes?: string | null;
}

export interface HousekeepingListResponse {
  items: HousekeepingRoomCard[];
  /** Дата снимка такая же, как в запросе (YYYY-MM-DD). */
  date: string;
}
