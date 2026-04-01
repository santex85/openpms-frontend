import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "@/api/auth";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { getAccessToken } from "@/lib/authSession";

export function useCurrentUser() {
  const authKey = authQueryKeyPart();
  const hasToken =
    typeof window !== "undefined" &&
    (() => {
      const t = getAccessToken();
      return t !== null && t !== "";
    })();

  return useQuery({
    queryKey: ["auth", "me", authKey],
    queryFn: () => fetchMe(),
    enabled: hasToken,
  });
}
