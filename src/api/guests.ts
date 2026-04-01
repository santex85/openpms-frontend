import { apiClient } from "@/lib/api";
import type {
  GuestCreate,
  GuestDetailRead,
  GuestListPage,
  GuestPatch,
  GuestRead,
} from "@/types/guests";

export async function fetchGuests(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<GuestListPage> {
  const qTrim = params?.q?.trim();
  const { data } = await apiClient.get<GuestListPage>("/guests", {
    params: {
      ...(qTrim !== undefined && qTrim !== "" ? { q: qTrim } : {}),
      limit: params?.limit ?? 25,
      offset: params?.offset ?? 0,
    },
  });
  return data;
}

export async function fetchGuest(guestId: string): Promise<GuestDetailRead> {
  const { data } = await apiClient.get<GuestDetailRead>(`/guests/${guestId}`);
  return data;
}

export async function patchGuest(
  guestId: string,
  body: GuestPatch
): Promise<GuestRead> {
  const { data } = await apiClient.patch<GuestRead>(
    `/guests/${guestId}`,
    body
  );
  return data;
}

export async function createGuest(body: GuestCreate): Promise<GuestRead> {
  const { data } = await apiClient.post<GuestRead>("/guests", body);
  return data;
}

