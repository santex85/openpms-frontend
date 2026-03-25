import { useQuery } from "@tanstack/react-query";

import { fetchProperties } from "@/api/properties";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export function useProperties() {
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["properties", authKey],
    queryFn: fetchProperties,
  });
}
