import { apiClient } from "@/lib/api";
import type { EmailLogRead } from "@/types/email-log";

export async function fetchBookingEmailLogs(
  bookingId: string
): Promise<EmailLogRead[]> {
  const { data } = await apiClient.get<EmailLogRead[]>(
    `/bookings/${bookingId}/email-logs`
  );
  return data;
}

export async function postBookingSendInvoice(bookingId: string): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/send-invoice`, {});
}

/** POST /email-logs/{id}/retry — re-queue a failed send when backend supports it. */
export async function postEmailLogRetry(emailLogId: string): Promise<void> {
  await apiClient.post(`/email-logs/${emailLogId}/retry`, {});
}
