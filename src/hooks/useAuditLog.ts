import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAuditLog, type AuditLogFetchResult } from "@/api/audit-log";
import { authQueryKeyPart } from "@/lib/authQueryKey";

const PAGE_SIZE = 50;

export function useAuditLog(page: number) {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["audit-log", authKey, page, PAGE_SIZE],
    queryFn: () =>
      fetchAuditLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
}

export const AUDIT_LOG_PAGE_SIZE = PAGE_SIZE;

export type { AuditLogFetchResult };
