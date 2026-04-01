import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchGuests } from "@/api/guests";
import { authQueryKeyPart } from "@/lib/authQueryKey";

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

  return useQuery({
    queryKey: [
      "guests",
      authKey,
      debouncedQ,
      listOptions.page,
      listOptions.pageSize,
    ],
    queryFn: () =>
      fetchGuests({
        ...(debouncedQ !== "" ? { q: debouncedQ } : {}),
        limit: listOptions.pageSize,
        offset: listOptions.page * listOptions.pageSize,
      }),
  });
}
