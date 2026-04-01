import { apiClient } from "@/lib/api";
import type { AuditLogEntry } from "@/types/audit";

export async function fetchAuditLog(params: {
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>("/audit-log", {
    params: {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    },
  });
  return data;
}
