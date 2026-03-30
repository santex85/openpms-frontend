import { useQuery } from "@tanstack/react-query";

import { fetchBookingsUnpaidFolio } from "@/api/bookings";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { usePropertyStore } from "@/stores/property-store";

export function useBookingsUnpaidFolio(enabled: boolean) {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const authKey = authQueryKeyPart();

  return useQuery({
    queryKey: ["bookings", "unpaid-folio", authKey, selectedPropertyId],
    queryFn: () => fetchBookingsUnpaidFolio(selectedPropertyId!),
    enabled: Boolean(selectedPropertyId) && enabled,
    retry: false,
  });
}
