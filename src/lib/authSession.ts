/** In-memory access JWT; tenant id mirrored in sessionStorage for POST /auth/refresh body after F5. */

const TENANT_STORAGE_KEY = "openpms_tenant_id";

let accessToken: string | null = null;
let tenantIdMemory: string | null = null;
let sessionEpoch = 0;
const listeners = new Set<() => void>();

function notify(): void {
  sessionEpoch += 1;
  listeners.forEach((fn) => {
    fn();
  });
}

export function getSessionEpoch(): number {
  return sessionEpoch;
}

export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setSession(access: string, tenantId: string): void {
  accessToken = access;
  tenantIdMemory = tenantId;
  try {
    sessionStorage.setItem(TENANT_STORAGE_KEY, tenantId);
  } catch {
    /* ignore quota / private mode */
  }
  notify();
}

export function clearSession(): void {
  accessToken = null;
  tenantIdMemory = null;
  try {
    sessionStorage.removeItem(TENANT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
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
