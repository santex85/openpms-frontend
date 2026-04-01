import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";

export interface UsePaginatedQueryOptions {
  enabled?: boolean;
}

export function usePaginatedQuery<
  TItem,
  TPage extends { items: TItem[]; total: number },
>(
  queryKey: unknown[],
  fetcher: (params: {
    limit: number;
    offset: number;
  }) => Promise<TPage>,
  page: number,
  pageSize: number,
  options?: UsePaginatedQueryOptions
): UseQueryResult<TPage> {
  const offset = page * pageSize;
  return useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => fetcher({ limit: pageSize, offset }),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
