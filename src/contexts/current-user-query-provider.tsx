import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { CurrentUserQueryContext } from "@/contexts/current-user-context";
import type { UserRead } from "@/types/api";

export function CurrentUserQueryProvider({
  value,
  children,
}: {
  value: UseQueryResult<UserRead>;
  children: ReactNode;
}) {
  return (
    <CurrentUserQueryContext.Provider value={value}>
      {children}
    </CurrentUserQueryContext.Provider>
  );
}
