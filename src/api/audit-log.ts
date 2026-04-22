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
  entity_id?: string;
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
  if (params.entity_id !== undefined && params.entity_id.trim() !== "") {
    u.set("entity_id", params.entity_id.trim());
  }
  const qs = u.toString();
  return qs === "" ? "" : `?${qs}`;
}

export async function fetchAuditLog(params: {
  limit?: number;
  offset?: number;
  action?: string[];
  entity_type?: string[];
  entity_id?: string;
}): Promise<AuditLogFetchResult> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const qs = auditLogQueryString({
    limit,
    offset,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
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
