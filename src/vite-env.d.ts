/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Stripe publishable key (pk_test_… / pk_live_…) for Elements and card tokenization */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** If "true", show HTTP route hints in the UI (for developers). */
  readonly VITE_SHOW_API_ROUTES?: string;
  /** If "true", PATCH /bookings 404/405 is ignored (dev-only mock). */
  readonly VITE_MOCK_BOOKING_ASSIGN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
