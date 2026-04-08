/** Channex Channel Manager integration (API mirrors backend schemas). */

export interface ChannexProperty {
  id: string;
  title: string | null;
}

export interface ChannexPropertyLink {
  id: string;
  property_id: string;
  channex_property_id: string;
  channex_webhook_id?: string | null;
  channex_env: string;
  status: string;
  connected_at: string | null;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ChannexRoomTypeMap {
  id: string;
  room_type_id: string;
  channex_room_type_id: string;
  channex_room_type_name: string | null;
}

export interface ChannexStatus {
  connected: boolean;
  link: ChannexPropertyLink | null;
  room_maps_count: number;
  rate_maps_count: number;
  room_type_maps: ChannexRoomTypeMap[];
}

export interface ChannexRoomTypeRow {
  id: string;
  title: string | null;
}

export interface ChannexRatePlanRow {
  id: string;
  title: string | null;
}

/** Result of POST /channex/provision-from-openpms */
export interface ChannexProvisionResult {
  room_types_created: number;
  room_types_skipped: number;
  rate_plans_created: number;
  rate_plans_skipped: number;
}

export interface ChannexValidateKeyBody {
  api_key: string;
  env: string;
}

export interface ChannexConnectBody {
  api_key: string;
  env: string;
  channex_property_id: string;
}

export interface RoomMappingItem {
  room_type_id: string;
  channex_room_type_id: string;
  channex_room_type_name: string | null;
}

export interface RoomMappingBody {
  mappings: RoomMappingItem[];
}

export interface RateMappingItem {
  room_type_map_id: string;
  rate_plan_id: string;
  channex_rate_plan_id: string;
  channex_rate_plan_name: string | null;
}

export interface RateMappingBody {
  mappings: RateMappingItem[];
}
