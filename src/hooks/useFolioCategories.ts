import { useQuery } from "@tanstack/react-query";

import { fetchFolioCategories } from "@/api/folioCategories";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { getAccessToken } from "@/lib/authSession";

export function useFolioCategories() {
  const authKey = authQueryKeyPart();
  const hasToken =
    typeof window !== "undefined" &&
    (() => {
      const t = getAccessToken();
      return t !== null && t !== "";
    })();

  return useQuery({
    queryKey: ["folio-categories", authKey] as const,
    queryFn: () => fetchFolioCategories(),
    enabled: hasToken,
  });
}
