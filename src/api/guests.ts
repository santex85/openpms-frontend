import { apiClient } from "@/lib/api";
import type { GuestRead } from "@/types/api";

export async function fetchGuests(params?: {
  q?: string;
}): Promise<GuestRead[]> {
  const qTrim = params?.q?.trim();
  const { data } = await apiClient.get<GuestRead[]>("/guests", {
    params:
      qTrim !== undefined && qTrim !== ""
        ? { q: qTrim }
        : undefined,
  });
  return data;
}
