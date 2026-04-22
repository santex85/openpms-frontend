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
  /** Если false — строку нельзя отменить через DELETE. */
  voidable?: boolean;
}

/** POST /bookings/{id}/folio — единое тело проводки. */
export type FolioEntryCreate =
  | {
      entry_type: "charge";
      amount: string;
      category: string;
      description?: string | null;
    }
  | {
      entry_type: "payment";
      amount: string;
      /** Must be `"payment"` (API requires category on all folio lines). */
      category: "payment";
      payment_method: string;
      description?: string | null;
    };

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

export async function postFolioEntry(
  bookingId: string,
  body: FolioEntryCreate
): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/folio`, body);
}

export async function deleteFolioTransaction(
  bookingId: string,
  transactionId: string
): Promise<void> {
  await apiClient.delete(`/bookings/${bookingId}/folio/${transactionId}`);
}

/** POST /bookings/{id}/folio/{tx_id}/reverse — preferred reversal (TZ-10). */
export async function reverseFolioTransaction(
  bookingId: string,
  transactionId: string
): Promise<void> {
  await apiClient.post(
    `/bookings/${bookingId}/folio/${encodeURIComponent(transactionId)}/reverse`
  );
}
