import axios from "axios";

import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  Booking,
  BookingCreateRequest,
  BookingCreateResponse,
  BookingUnpaidFolioRow,
} from "@/types/api";

export interface FetchBookingsParams {
  propertyId: string;
  startDate: string;
  endDate: string;
}

interface BookingTapePage {
  items: Booking[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchBookings(
  params: FetchBookingsParams
): Promise<Booking[]> {
  const { data } = await apiClient.get<BookingTapePage>("/bookings", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  });
  return data.items;
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
