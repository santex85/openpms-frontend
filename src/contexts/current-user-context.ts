import { createContext } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import type { UserRead } from "@/types/api";

export const CurrentUserQueryContext = createContext<
  UseQueryResult<UserRead> | null
>(null);
