/** One cell from GET /inventory/availability (date × room type). */
export interface AvailabilityCell {
  date: string;
  room_type_id: string;
  room_type_name: string;
  total_rooms: number;
  booked_rooms: number;
  blocked_rooms: number;
  available_rooms: number;
}

export interface AvailabilityGridResponse {
  property_id: string;
  start_date: string;
  end_date: string;
  cells: AvailabilityCell[];
}

/** PUT /inventory/availability/overrides */
export interface AvailabilityOverridePutBody {
  room_type_id: string;
  start_date: string;
  end_date: string;
  blocked_rooms: number;
}

export interface AvailabilityOverridePutResponse {
  dates_updated: number;
}
