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

/** Брони с положительным балансом фолио (агрегат на бэке). */
export async function fetchBookingsUnpaidFolio(
  propertyId: string
): Promise<BookingUnpaidFolioRow[]> {
  const { data } = await apiClient.get<BookingUnpaidFolioRow[]>(
    "/bookings/unpaid-folio-summary",
    {
      params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
    }
  );
  return data;
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
  room_id?: string | null;
  status?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  cancellation_reason?: string | null;
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
