/** GET /properties/{id}/stripe/status */
export interface StripeStatusRead {
  status: "not_connected" | "connected";
  livemode?: boolean | null;
  connected_at?: string | null;
}

/** GET /properties/{id}/stripe/connect-url */
export interface StripeConnectUrlResponse {
  url: string;
}

/** Saved payment method row */
export interface PaymentMethodRead {
  id: string;
  tenant_id: string;
  property_id: string;
  booking_id: string | null;
  stripe_pm_id: string;
  card_last4: string | null;
  card_brand: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  label: string | null;
  created_at: string;
}

/** POST /properties/{id}/stripe/payment-methods */
export interface SavePaymentMethodRequest {
  stripe_pm_id: string;
  booking_id?: string | null;
  label?: string | null;
}

/** POST /bookings/{id}/stripe/charge — stripe_pm_id is internal row UUID */
export interface ChargeRequest {
  stripe_pm_id: string;
  amount: string;
  label?: string | null;
}

/** POST /bookings/{id}/stripe/refund — stripe_charge_id is internal row UUID */
export interface RefundRequest {
  stripe_charge_id: string;
  amount?: string | null;
}

/** GET /bookings/{id}/stripe/charges row */
export interface ChargeRead {
  id: string;
  tenant_id: string;
  property_id: string;
  booking_id: string | null;
  folio_tx_id: string | null;
  stripe_charge_id: string;
  stripe_pm_id: string | null;
  amount: string;
  currency: string;
  status: string;
  failure_message: string | null;
  created_at: string;
}
