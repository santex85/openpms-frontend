/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** If "true", PATCH /bookings 404/405 is ignored (dev-only mock). */
  readonly VITE_MOCK_BOOKING_ASSIGN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
