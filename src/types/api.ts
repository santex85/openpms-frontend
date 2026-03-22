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
