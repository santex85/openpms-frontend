/** Row from GET /bookings/{id}/email-logs (snake_case from API). */
export interface EmailLogRead {
  id: string;
  tenant_id: string;
  property_id: string | null;
  booking_id: string | null;
  to_address: string;
  template_name: string;
  subject: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string;
}
