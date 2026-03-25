import axios from "axios";

import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type { Booking } from "@/types/api";

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

const mockAssign =
  import.meta.env.VITE_MOCK_BOOKING_ASSIGN === "true";

export async function assignBookingToRoom(
  bookingId: string,
  roomId: string
): Promise<void> {
  try {
    await apiClient.patch(`/bookings/${bookingId}`, {
      room_id: roomId,
    });
  } catch (err) {
    if (
      mockAssign &&
      axios.isAxiosError(err) &&
      (err.response?.status === 404 || err.response?.status === 405)
    ) {
      console.warn(
        "assignBookingToRoom: mock mode, PATCH missing — skipping",
        err
      );
      return;
    }
    throw err;
  }
}
