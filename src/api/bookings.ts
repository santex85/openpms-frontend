import axios from "axios";

import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  Booking,
  BookingCreateRequest,
  BookingCreateResponse,
  BookingUnpaidFolioRow,
} from "@/types/api";

export interface BookingTapePage {
  items: Booking[];
  total: number;
  limit: number;
  offset: number;
}

export interface FetchBookingsDateRangeParams {
  propertyId: string;
  startDate: string;
  endDate: string;
}

export interface FetchBookingsTapeParams extends FetchBookingsDateRangeParams {
  limit?: number;
  offset?: number;
  status?: string;
}

const BOOKING_PAGE_CHUNK = 500;

export async function fetchBookingsTape(
  params: FetchBookingsTapeParams
): Promise<BookingTapePage> {
  const limit = params.limit ?? 25;
  const offset = params.offset ?? 0;
  const statusTrim = params.status?.trim();
  const { data } = await apiClient.get<BookingTapePage>("/bookings", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      start_date: params.startDate,
      end_date: params.endDate,
      limit,
      offset,
      ...(statusTrim !== undefined && statusTrim !== ""
        ? { status: statusTrim }
        : {}),
    },
  });
  return data;
}

export async function fetchBookingsAllInRange(
  params: FetchBookingsDateRangeParams
): Promise<Booking[]> {
  const items: Booking[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchBookingsTape({
      ...params,
      limit: BOOKING_PAGE_CHUNK,
      offset,
    });
    items.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total || page.items.length === 0) {
      break;
    }
  }
  return items;
}

/** GET /bookings/{booking_id} — полная карточка вне окна списка по датам. */
export async function fetchBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.get<Booking>(`/bookings/${bookingId}`);
  return data;
}

const UNPAID_FOLIO_PATHS = [
  "/unpaid-folio-summary",
  "/bookings/unpaid-folio-summary",
  "/dashboard/unpaid-folio-summary",
] as const;

function shouldRetryUnpaidFolioPath(
  status: number | null,
  detail: unknown
): boolean {
  if (status === 404) {
    return true;
  }
  if (status !== 422 || !Array.isArray(detail)) {
    return false;
  }
  return detail.some((row: unknown) => {
    if (typeof row !== "object" || row === null) {
      return false;
    }
    const o = row as { type?: string; loc?: unknown };
    if (o.type !== "uuid_parsing") {
      return false;
    }
    if (!Array.isArray(o.loc)) {
      return false;
    }
    return o.loc.includes("path") && o.loc.includes("booking_id");
  });
}

/** Брони с положительным балансом фолио (агрегат на бэке). */
export async function fetchBookingsUnpaidFolio(
  propertyId: string
): Promise<BookingUnpaidFolioRow[]> {
  const params = { [PROPERTY_ID_QUERY_PARAM]: propertyId };
  let lastErr: unknown;

  for (let i = 0; i < UNPAID_FOLIO_PATHS.length; i++) {
    const path = UNPAID_FOLIO_PATHS[i];
    try {
      const { data } = await apiClient.get<BookingUnpaidFolioRow[]>(path, {
        params,
      });
      return data;
    } catch (err) {
      lastErr = err;
      const ax = axios.isAxiosError(err) ? err : null;
      const body = ax?.response?.data as { detail?: unknown } | undefined;
      const detail = body?.detail ?? null;
      const status = ax?.response?.status ?? null;
      const canTryNext =
        i < UNPAID_FOLIO_PATHS.length - 1 &&
        shouldRetryUnpaidFolioPath(status, detail);
      if (!canTryNext) {
        throw err;
      }
    }
  }

  throw lastErr;
}

export async function createBooking(
  body: BookingCreateRequest
): Promise<BookingCreateResponse> {
  const { data } = await apiClient.post<BookingCreateResponse>(
    "/bookings",
    body
  );
  return data;
}

const mockAssign =
  import.meta.env.VITE_MOCK_BOOKING_ASSIGN === "true";

export interface BookingPatchBody {
  /** Resend with date patches if the server should keep the assignment (backend must preserve lines / validate conflict). */
  room_id?: string | null;
  status?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  cancellation_reason?: string | null;
  /** Supported only if backend accepts notes on PATCH; otherwise API returns an error. */
  notes?: string | null;
}

/** True when PATCH includes stay dates — backend may recalculate folio / taxes (TZ-10 AC-12). */
export function bookingPatchTouchesStayDates(body: BookingPatchBody): boolean {
  return (
    Object.prototype.hasOwnProperty.call(body, "check_in") ||
    Object.prototype.hasOwnProperty.call(body, "check_out")
  );
}

export async function patchBooking(
  bookingId: string,
  body: BookingPatchBody
): Promise<void> {
  try {
    await apiClient.patch(`/bookings/${bookingId}`, body);
  } catch (err) {
    if (
      mockAssign &&
      axios.isAxiosError(err) &&
      (err.response?.status === 404 || err.response?.status === 405)
    ) {
      console.warn("patchBooking: mock mode — skipping", err);
      return;
    }
    throw err;
  }
}

export async function assignBookingToRoom(
  bookingId: string,
  roomId: string
): Promise<void> {
  await patchBooking(bookingId, { room_id: roomId });
}
