import { useEffect, useState } from "react";

import { fetchGuests } from "@/api/guests";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

const DEBOUNCE_MS = 300;

export interface UseGuestsListOptions {
  page: number;
  pageSize: number;
}

/**
 * Tenant-wide guest list with optional search q (debounced) and pagination.
 */
export function useGuests(searchInput: string, listOptions: UseGuestsListOptions) {
  const authKey = authQueryKeyPart();
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === "") {
      setDebouncedQ("");
      return;
    }
    const t = window.setTimeout(() => {
      setDebouncedQ(trimmed);
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
    };
  }, [searchInput]);

  return usePaginatedQuery(
    ["guests", authKey, debouncedQ],
    ({ limit, offset }) =>
      fetchGuests({
        ...(debouncedQ !== "" ? { q: debouncedQ } : {}),
        limit,
        offset,
      }),
    listOptions.page,
    listOptions.pageSize
  );
}
