import { apiClient } from "@/lib/api";
import type { AuditLogEntry } from "@/types/audit";

export interface AuditLogFetchResult {
  items: AuditLogEntry[];
  /** Lower bound for count display; use hasMore for next page. */
  total: number;
  hasMore: boolean;
}

export async function fetchAuditLog(params: {
  limit?: number;
  offset?: number;
}): Promise<AuditLogFetchResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const { data } = await apiClient.get<
    | AuditLogEntry[]
    | {
        items: AuditLogEntry[];
        total: number;
        limit?: number;
        offset?: number;
      }
  >("/audit-log", {
    params: { limit, offset },
  });

  if (Array.isArray(data)) {
    const hasMore = data.length >= limit;
    return {
      items: data,
      total: hasMore ? offset + data.length + limit : offset + data.length,
      hasMore,
    };
  }

  const items = data.items ?? [];
  const total = data.total ?? items.length;
  return {
    items,
    total,
    hasMore: offset + items.length < total,
  };
}
