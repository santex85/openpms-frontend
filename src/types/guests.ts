/** Guest summary on booking tape (GET /bookings). */
export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notes?: string | null;
}

/** POST /guests body */
export interface GuestCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  passport_data?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
  vip_status?: boolean;
}

/** Guest profile row (GET /guests). */
export interface GuestRead {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  passport_data: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  notes: string | null;
  vip_status: boolean;
  created_at: string;
  updated_at: string;
  extension_data?: Record<string, unknown> | null;
}

/** Paginated GET /guests. */
export interface GuestListPage {
  items: GuestRead[];
  total: number;
  limit: number;
  offset: number;
}

/** Booking rows returned in GuestDetailRead.bookings. */
export interface GuestBookingSummary {
  id: string;
  property_id: string;
  status: string;
  source: string;
  total_amount: string;
  check_in_date: string | null;
  check_out_date: string | null;
}

/** GET /guests/{id} */
export interface GuestDetailRead extends GuestRead {
  bookings: GuestBookingSummary[];
}

/** PATCH /guests/{id} body */
export interface GuestPatch {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  passport_data?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
  vip_status?: boolean | null;
  /** Extension field values (JSON), TZ-10 Country Pack extensions. */
  extension_data?: Record<string, unknown> | null;
}
