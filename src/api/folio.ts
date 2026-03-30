import { apiClient } from "@/lib/api";

export interface FolioTransactionRead {
  id: string;
  tenant_id: string;
  booking_id: string;
  transaction_type: string;
  amount: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
  category: string;
  /** Если true, можно отправить сторно по этой строке. */
  voidable?: boolean;
}

export interface FolioChargeCreate {
  amount: string;
  category: string;
  description?: string | null;
}

export interface FolioPaymentCreate {
  amount: string;
  payment_method: string;
  description?: string | null;
}

export interface FolioReversalCreate {
  reverses_transaction_id: string;
  reason?: string | null;
}

export interface FolioListResponse {
  transactions: FolioTransactionRead[];
  balance: string;
}

export async function fetchBookingFolio(
  bookingId: string
): Promise<FolioListResponse> {
  const { data } = await apiClient.get<FolioListResponse>(
    `/bookings/${bookingId}/folio`
  );
  return data;
}

export async function postFolioCharge(
  bookingId: string,
  body: FolioChargeCreate
): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/folio/charges`, body);
}

export async function postFolioPayment(
  bookingId: string,
  body: FolioPaymentCreate
): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/folio/payments`, body);
}

/** Сторно проводки (новая оборотная запись или void по политике бэкенда). */
export async function postFolioReversal(
  bookingId: string,
  body: FolioReversalCreate
): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/folio/reversals`, body);
}
