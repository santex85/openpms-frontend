import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchGuests } from "@/api/guests";
import { authQueryKeyPart } from "@/lib/authQueryKey";

const DEBOUNCE_MS = 300;

/**
 * Tenant-wide guest list with optional search q (debounced).
 */
export function useGuests(searchInput: string) {
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
    queryKey: ["guests", authKey, debouncedQ],
    queryFn: () =>
      fetchGuests(
        debouncedQ !== "" ? { q: debouncedQ } : undefined
      ),
  });
}
