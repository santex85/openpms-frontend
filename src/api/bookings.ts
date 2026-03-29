import axios from "axios";

import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  Booking,
  BookingCreateRequest,
  BookingCreateResponse,
} from "@/types/api";

export interface FetchBookingsParams {
  propertyId: string;
  startDate: string;
  endDate: string;
}

export async function fetchBookings(
  params: FetchBookingsParams
): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>("/bookings", {
    params: {
      [PROPERTY_ID_QUERY_PARAM]: params.propertyId,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  });
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
