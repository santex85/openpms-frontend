import { apiClient } from "@/lib/api";
import type { AuditLogEntry } from "@/types/audit";

export interface AuditLogFetchResult {
  items: AuditLogEntry[];
  /** Lower bound for count display; use hasMore for next page. */
  total: number;
  hasMore: boolean;
}

function auditLogQueryString(params: {
  limit: number;
  offset: number;
  action?: string[];
  entity_type?: string[];
}): string {
  const u = new URLSearchParams();
  u.set("limit", String(params.limit));
  u.set("offset", String(params.offset));
  for (const a of params.action ?? []) {
    u.append("action", a);
  }
  for (const e of params.entity_type ?? []) {
    u.append("entity_type", e);
  }
  const qs = u.toString();
  return qs === "" ? "" : `?${qs}`;
}

export async function fetchAuditLog(params: {
  limit?: number;
  offset?: number;
  action?: string[];
  entity_type?: string[];
}): Promise<AuditLogFetchResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const qs = auditLogQueryString({
    limit,
    offset,
    action: params.action,
    entity_type: params.entity_type,
  });
  const { data } = await apiClient.get<
    | AuditLogEntry[]
    | {
        items: AuditLogEntry[];
        total: number;
        limit?: number;
        offset?: number;
      }
  >(`/audit-log${qs}`);

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
