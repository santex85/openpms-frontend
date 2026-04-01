import { useContext } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { CurrentUserQueryContext } from "@/contexts/current-user-context";
import type { UserRead } from "@/types/api";

export function useCurrentUserQueryContext(): UseQueryResult<UserRead> {
  const ctx = useContext(CurrentUserQueryContext);
  if (ctx === null) {
    throw new Error(
      "useCurrentUserQueryContext must be used within CurrentUserQueryProvider"
    );
  }
  return ctx;
}
