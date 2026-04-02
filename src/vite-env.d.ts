/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** If "true", show HTTP route hints in the UI (for developers). */
  readonly VITE_SHOW_API_ROUTES?: string;
  /** If "true", PATCH /bookings 404/405 is ignored (dev-only mock). */
  readonly VITE_MOCK_BOOKING_ASSIGN?: string;
  /** If "true", show GET/POST API hints in the UI. Default: hidden. */
  readonly VITE_SHOW_API_ROUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
