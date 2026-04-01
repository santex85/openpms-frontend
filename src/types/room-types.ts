/** Room type: POST /room-types body */
export interface RoomTypeCreate {
  property_id: string;
  name: string;
  base_occupancy: number;
  max_occupancy: number;
}

/** Room type as returned by GET/POST /room-types */
export interface RoomType {
  id: string;
  tenant_id: string;
  property_id: string;
  name: string;
  base_occupancy: number;
  max_occupancy: number;
}

/** PATCH /room-types/{id} body */
export interface RoomTypePatch {
  name?: string;
  base_occupancy?: number;
  max_occupancy?: number;
}
