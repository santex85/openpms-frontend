/** GET/PUT nightly rates (`/rates`, `/rates/bulk`). */

export interface RatePlanRead {
  id: string;
  tenant_id: string;
  property_id: string;
  name: string;
  cancellation_policy: string;
}

/** POST /rate-plans body */
export interface RatePlanCreate {
  property_id: string;
  name: string;
  cancellation_policy: string;
}

export interface RateRead {
  id: string;
  tenant_id: string;
  room_type_id: string;
  rate_plan_id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Decimal from API as string */
  price: string;
}

export interface BulkRateSegment {
  room_type_id: string;
  rate_plan_id: string;
  start_date: string;
  end_date: string;
  price: string;
}

export interface BulkRatesPutRequest {
  segments: BulkRateSegment[];
}

export interface BulkRatesPutResponse {
  rows_upserted: number;
}
