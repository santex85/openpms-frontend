import { getAuthSessionRevision, getTenantIdForRefresh } from "@/lib/authSession";

/** Fragment for React Query keys: resets when tenant/session identity changes (login/logout), not on access-token refresh. */
export function authQueryKeyPart(): string {
  const tenant = getTenantIdForRefresh();
  const tid = tenant !== null && tenant !== "" ? tenant : "anon";
  return `${tid}:${getAuthSessionRevision()}`;
}
