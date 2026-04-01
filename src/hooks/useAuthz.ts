import { useCurrentUserQueryContext } from "@/hooks/useCurrentUserQueryContext";

function normalizeRole(role: string | undefined): string | null {
  if (role === undefined || role === "") {
    return null;
  }
  return role.trim().toLowerCase();
}

/** Role from GET /auth/me (via CurrentUserQueryProvider). */
export function useAuthRole(): string | null {
  const { data } = useCurrentUserQueryContext();
  return normalizeRole(data?.role);
}

export function useCanManageProperties(): boolean {
  const { data, isPending } = useCurrentUserQueryContext();
  if (isPending || data === undefined) {
    return false;
  }
  const r = normalizeRole(data.role);
  return r === "owner" || r === "manager";
}

/** owner / manager — inventory overrides */
export function useCanWriteInventory(): boolean {
  return useCanManageProperties();
}

/** owner / manager / receptionist */
export function useCanWriteBookings(): boolean {
  const { data, isPending } = useCurrentUserQueryContext();
  if (isPending || data === undefined) {
    return false;
  }
  const r = normalizeRole(data.role);
  return (
    r === "owner" || r === "manager" || r === "receptionist"
  );
}

/** GET /audit-log — owner и manager */
export function useCanViewAuditLog(): boolean {
  const { data, isPending } = useCurrentUserQueryContext();
  if (isPending || data === undefined) {
    return false;
  }
  const r = normalizeRole(data.role);
  return r === "owner" || r === "manager";
}
