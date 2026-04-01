import { useQuery } from "@tanstack/react-query";

import { fetchGuest } from "@/api/guests";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useGuest(guestId: string | undefined) {
  const authKey = authQueryKeyPart();
  const enabled = guestId !== undefined && guestId !== "";

  return useQuery({
    queryKey: ["guest", authKey, guestId],
    queryFn: () => fetchGuest(guestId!),
    enabled,
  });
}
