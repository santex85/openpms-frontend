import { apiClient } from "@/lib/api";
import type {
  ChargeRead,
  ChargeRequest,
  PaymentMethodRead,
  RefundRequest,
  SavePaymentMethodRequest,
  StripeConnectUrlResponse,
  StripeStatusRead,
} from "@/types/stripe";

export async function fetchStripeStatus(
  propertyId: string
): Promise<StripeStatusRead> {
  const { data } = await apiClient.get<StripeStatusRead>(
    `/properties/${propertyId}/stripe/status`
  );
  return data;
}

export async function fetchStripeConnectUrl(
  propertyId: string
): Promise<StripeConnectUrlResponse> {
  const { data } = await apiClient.get<StripeConnectUrlResponse>(
    `/properties/${propertyId}/stripe/connect-url`
  );
  return data;
}

export async function disconnectStripe(propertyId: string): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}/stripe/disconnect`);
}

export async function fetchPaymentMethods(
  propertyId: string,
  bookingId?: string | null
): Promise<PaymentMethodRead[]> {
  const { data } = await apiClient.get<PaymentMethodRead[]>(
    `/properties/${propertyId}/stripe/payment-methods`,
    {
      params:
        bookingId !== undefined && bookingId !== null && bookingId !== ""
          ? { booking_id: bookingId }
          : {},
    }
  );
  return data;
}

export async function savePaymentMethod(
  propertyId: string,
  body: SavePaymentMethodRequest
): Promise<PaymentMethodRead> {
  const { data } = await apiClient.post<PaymentMethodRead>(
    `/properties/${propertyId}/stripe/payment-methods`,
    body
  );
  return data;
}

export async function deletePaymentMethod(pmRowId: string): Promise<void> {
  await apiClient.delete(`/stripe/payment-methods/${pmRowId}`);
}

export async function chargeBooking(
  bookingId: string,
  body: ChargeRequest
): Promise<ChargeRead> {
  const { data } = await apiClient.post<ChargeRead>(
    `/bookings/${bookingId}/stripe/charge`,
    body
  );
  return data;
}

export async function refundBooking(
  bookingId: string,
  body: RefundRequest
): Promise<ChargeRead> {
  const { data } = await apiClient.post<ChargeRead>(
    `/bookings/${bookingId}/stripe/refund`,
    body
  );
  return data;
}

export async function fetchBookingStripeCharges(
  bookingId: string
): Promise<ChargeRead[]> {
  const { data } = await apiClient.get<ChargeRead[]>(
    `/bookings/${bookingId}/stripe/charges`
  );
  return data;
}
