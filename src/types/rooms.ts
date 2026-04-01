/** POST /rooms body */
export interface RoomCreate {
  room_type_id: string;
  name: string;
  /** Optional; backend default "available" */
  status?: string;
}

/** PATCH /rooms/{id} body */
export interface RoomPatch {
  room_type_id?: string;
  name?: string;
  status?: string;
}

/** Physical room for board rows (GET/POST /rooms?property_id=…). */
export interface RoomRow {
  id: string;
  room_type_id: string;
  name: string;
  status: string;
  housekeeping_status: string;
  housekeeping_priority: string;
}
