import { useQuery } from "@tanstack/react-query";

import { fetchAuditLog } from "@/api/audit-log";
import { authQueryKeyPart } from "@/lib/authQueryKey";

const PAGE_SIZE = 50;

export function useAuditLog(page: number) {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["audit-log", authKey, page],
    queryFn: () =>
      fetchAuditLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });
}

export const AUDIT_LOG_PAGE_SIZE = PAGE_SIZE;
