import axios from "axios";

export function isAxiosForbidden(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 403;
}

/** When the API returns 403 without a user-facing `detail`, use these strings. */
export const ForbiddenMessages = {
  ratePlanWrite:
    "Недостаточно прав: тарифные планы создают owner и manager.",
  propertyCreate:
    "Недостаточно прав: создание отеля доступно ролям owner и manager.",
  propertyUpdate:
    "Недостаточно прав: изменение отеля доступно ролям owner и manager.",
  roomTypeCreate: "Недостаточно прав: типы номеров создают owner и manager.",
  roomCreate:
    "Недостаточно прав: создание номеров доступно ролям owner и manager.",
} as const;
