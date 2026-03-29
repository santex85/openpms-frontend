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
