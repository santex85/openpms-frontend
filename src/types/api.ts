/** Property (hotel) as returned by GET /properties. */
export interface Property {
  id: string;
  name: string;
}

/** Room type as returned by GET /room-types?property_id=… */
export interface RoomType {
  id: string;
  name: string;
  property_id?: string;
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

/** Physical room for board rows (GET /rooms?property_id=…). */
export interface RoomRow {
  id: string;
  room_type_id: string;
  name: string;
}
