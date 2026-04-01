/**
 * Decode JWT payload (no signature verification) for UI hints only.
 */
import { getAccessToken } from "@/lib/authSession";

function decodePayloadSegment(segment: string): Record<string, unknown> | null {
  try {
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Role claim from access token (lowercase), or null if missing. */
export function getRoleFromAccessToken(): string | null {
  const token = getAccessToken();
  if (token === null || token === "") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = decodePayloadSegment(parts[1]);
  if (payload === null) {
    return null;
  }
  const role = payload.role;
  if (typeof role === "string" && role !== "") {
    return role.trim().toLowerCase();
  }
  return null;
}

export function canManagePropertiesFromToken(): boolean {
  const role = getRoleFromAccessToken();
  if (role === null) {
    return true;
  }
  return role === "owner" || role === "manager";
}

/** owner / manager — PUT /inventory/availability/overrides (matches API roles). */
export function canWriteInventoryFromToken(): boolean {
  return canManagePropertiesFromToken();
}

/** owner / manager / receptionist — POST /bookings and аналогичные действия. */
export function canWriteBookingsFromToken(): boolean {
  const role = getRoleFromAccessToken();
  if (role === null) {
    return true;
  }
  return (
    role === "owner" || role === "manager" || role === "receptionist"
  );
}

/** GET /audit-log — только owner и manager (JWT). */
export function canViewAuditLogFromToken(): boolean {
  const role = getRoleFromAccessToken();
  if (role === null) {
    return false;
  }
  return role === "owner" || role === "manager";
}
