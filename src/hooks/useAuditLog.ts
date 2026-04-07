import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAuditLog, type AuditLogFetchResult } from "@/api/audit-log";
import { authQueryKeyPart } from "@/lib/authQueryKey";

const PAGE_SIZE = 50;

export interface AuditLogFilters {
  action?: string[];
  entity_type?: string[];
}

function normalizeFilterList(list: string[] | undefined): string[] {
  if (list === undefined || list.length === 0) {
    return [];
  }
  return [...new Set(list.map((x) => x.trim()).filter(Boolean))].sort();
}

export function useAuditLog(page: number, filters: AuditLogFilters = {}) {
  const authKey = authQueryKeyPart();
  const action = normalizeFilterList(filters.action);
  const entity_type = normalizeFilterList(filters.entity_type);

  return useQuery({
    queryKey: [
      "audit-log",
      authKey,
      page,
      PAGE_SIZE,
      action,
      entity_type,
    ],
    queryFn: () =>
      fetchAuditLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: action.length > 0 ? action : undefined,
        entity_type: entity_type.length > 0 ? entity_type : undefined,
      }),
    placeholderData: keepPreviousData,
  });
}

export const AUDIT_LOG_PAGE_SIZE = PAGE_SIZE;

export type { AuditLogFetchResult };
