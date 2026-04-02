import { useQuery } from "@tanstack/react-query";

import { fetchAssignableRooms } from "@/api/rooms";
import { authQueryKeyPart } from "@/lib/authQueryKey";

export interface UseAssignableRoomsParams {
  propertyId: string | null;
  roomTypeId: string | null;
  checkIn: string;
  checkOut: string;
  ratePlanId: string;
  /** When false, the query does not run. */
  enabled: boolean;
}

export function useAssignableRooms(params: UseAssignableRoomsParams) {
  const authKey = authQueryKeyPart();
  const cin = params.checkIn.trim();
  const cout = params.checkOut.trim();
  const plan = params.ratePlanId.trim();
  const datesOk = cin !== "" && cout !== "" && cout > cin;

  return useQuery({
    queryKey: [
      "rooms",
      "assignable",
      authKey,
      params.propertyId,
      params.roomTypeId,
      cin,
      cout,
      plan,
    ],
    queryFn: () =>
      fetchAssignableRooms({
        propertyId: params.propertyId!,
        roomTypeId: params.roomTypeId!,
        checkIn: cin,
        checkOut: cout,
      }),
    enabled:
      Boolean(params.enabled) &&
      params.propertyId !== null &&
      params.roomTypeId !== null &&
      plan !== "" &&
      datesOk,
  });
}
