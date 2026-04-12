import type { Guest } from "./guests";

/** Authenticated user from POST /auth/login or GET /auth/me. */
export interface UserRead {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

/** Property (hotel): POST body for create. */
export interface PropertyCreate {
  name: string;
  timezone: string;
  currency: string;
  /** ISO-like time string e.g. "14:00:00" */
  checkin_time: string;
  checkout_time: string;
  /** Optional; prefer POST /country-packs/{code}/apply for pack changes. */
  country_pack_code?: string | null;
}

/** Property as returned by GET/POST /properties. */
export interface PropertyRead {
  id: string;
  tenant_id: string;
  name: string;
  timezone: string;
  currency: string;
  checkin_time: string;
  checkout_time: string;
  /** Country pack code from TZ-9; null if not configured. */
  country_pack_code?: string | null;
}

export type {
  Guest,
  GuestBookingSummary,
  GuestCreate,
  GuestDetailRead,
  GuestListPage,
  GuestPatch,
  GuestRead,
} from "./guests";

export type {
  RoomCreate,
  RoomPatch,
  RoomRow,
} from "./rooms";

export type {
  RoomType,
  RoomTypeCreate,
  RoomTypePatch,
} from "./room-types";

/** Строка GET /bookings/unpaid-folio-summary (или аналог на бэке). */
export interface BookingUnpaidFolioRow {
  booking_id: string;
  balance: string;
  guest_name?: string;
}

/** Booking row for board (GET /bookings), snake_case from API. */
export interface Booking {
  id: string;
  tenant_id: string;
  property_id: string;
  guest_id: string;
  status: string;
  source: string;
  total_amount: string;
  guest: Guest;
  check_in_date: string | null;
  check_out_date: string | null;
  room_id: string | null;
  /** Present when all booking lines share one room type. */
  room_type_id?: string | null;
  /** When API returns booking-level notes (optional). */
  notes?: string | null;
  /** Additional guests on the booking when API embeds them (optional). */
  guests?: Guest[];
  booking_type?: string | null;
  rate_plan_id?: string | null;
}

/** Guest on POST /bookings body */
export interface BookingGuestPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  passport_data?: string | null;
}

/** POST /bookings body */
export interface BookingCreateRequest {
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  check_in: string;
  check_out: string;
  guest: BookingGuestPayload;
  status?: string;
  source?: string;
  /** When true, backend skips merging with existing guest profile (TZ-10). */
  force_new_guest?: boolean;
}

export interface NightlyPriceLine {
  date: string;
  price: string;
}

/** POST /bookings response */
export interface BookingCreateResponse {
  booking_id: string;
  guest_id: string;
  total_amount: string;
  nights: NightlyPriceLine[];
  /** True when an existing guest profile was linked (TZ-10). */
  guest_merged?: boolean;
}

/** GET /dashboard/summary */
export interface DashboardSummary {
  arrivals_today: number;
  departures_today: number;
  occupied_rooms: number;
  total_rooms: number;
  dirty_rooms: number;
  currency: string;
  /** Present on API builds that embed unpaid folio rows in the dashboard summary. */
  unpaid_folio?: BookingUnpaidFolioRow[];
}
