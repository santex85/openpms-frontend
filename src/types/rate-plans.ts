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

/** PATCH /rate-plans/{id} body */
export interface RatePlanPatch {
  name?: string;
  cancellation_policy?: string;
}
