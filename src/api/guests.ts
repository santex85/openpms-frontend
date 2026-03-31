import { apiClient } from "@/lib/api";
import type { GuestRead } from "@/types/api";

interface GuestListPage {
  items: GuestRead[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchGuests(params?: {
  q?: string;
}): Promise<GuestRead[]> {
  const qTrim = params?.q?.trim();
  const { data } = await apiClient.get<GuestListPage>("/guests", {
    params:
      qTrim !== undefined && qTrim !== ""
        ? { q: qTrim }
        : undefined,
  });
  return data.items;
}
