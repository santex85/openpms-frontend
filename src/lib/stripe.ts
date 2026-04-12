import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Stripe.js singleton for Elements. Requires `VITE_STRIPE_PUBLISHABLE_KEY` (pk_test_… / pk_live_…).
 */
export function getStripePromise(): Promise<Stripe | null> {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    return Promise.resolve(null);
  }
  if (stripePromise === null) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
