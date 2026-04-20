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

export type RoomBulkOnConflict = "skip" | "fail";

export interface RoomBulkCreateItem {
  name: string;
  status: string;
}

/** POST /rooms/bulk body */
export interface RoomBulkCreate {
  room_type_id: string;
  rooms: RoomBulkCreateItem[];
  on_conflict: RoomBulkOnConflict;
}

export interface RoomBulkCreateResult {
  created: RoomRow[];
  skipped: string[];
}
