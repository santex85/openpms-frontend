/** In-memory access JWT; tenant id mirrored in sessionStorage for POST /auth/refresh body after F5. */

const TENANT_STORAGE_KEY = "openpms_tenant_id";

let accessToken: string | null = null;
let tenantIdMemory: string | null = null;
/**
 * Increments only on full session establish (login/register) or logout — not on silent token refresh.
 * Used in React Query keys via authQueryKeyPart().
 */
let authSessionRevision = 0;

export function getAuthSessionRevision(): number {
  return authSessionRevision;
}

export function setSession(access: string, tenantId: string): void {
  accessToken = access;
  tenantIdMemory = tenantId;
  try {
    sessionStorage.setItem(TENANT_STORAGE_KEY, tenantId);
  } catch {
    /* ignore quota / private mode */
  }
  authSessionRevision += 1;
}

export function clearSession(): void {
  accessToken = null;
  tenantIdMemory = null;
  try {
    sessionStorage.removeItem(TENANT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  authSessionRevision += 1;
}

/** Updates JWT after /auth/refresh without rotating React Query cache keys. */
export function replaceAccessToken(access: string): void {
  accessToken = access;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Tenant for refresh bootstrap and API scoping. */
export function getTenantIdForRefresh(): string | null {
  if (tenantIdMemory !== null && tenantIdMemory !== "") {
    return tenantIdMemory;
  }
  try {
    return sessionStorage.getItem(TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}
