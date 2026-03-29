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
}

/** Room type as returned by GET /room-types?property_id=… */
export interface RoomType {
  id: string;
  name: string;
  property_id?: string;
}

/** POST /rooms body */
export interface RoomCreate {
  room_type_id: string;
  name: string;
  /** Optional; backend default "available" */
  status?: string;
}

/** Guest summary on booking tape (GET /bookings). */
export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
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
}

/** Physical room for board rows (GET/POST /rooms?property_id=…). */
export interface RoomRow {
  id: string;
  room_type_id: string;
  name: string;
  status: string;
}
