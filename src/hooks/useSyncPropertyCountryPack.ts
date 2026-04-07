import { useEffect } from "react";

import { useProperties } from "@/hooks/useProperties";
import { usePropertyStore } from "@/stores/property-store";

/** Keeps Zustand `countryPackCode` aligned with GET /properties for the selected hotel (TZ-10 AC-13). */
export function useSyncPropertyCountryPack(): void {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const setCountryPackCode = usePropertyStore((s) => s.setCountryPackCode);
  const { data: properties } = useProperties();

  useEffect(() => {
    if (selectedPropertyId === null || properties === undefined) {
      setCountryPackCode(null);
      return;
    }
    const row = properties.find((p) => p.id === selectedPropertyId);
    setCountryPackCode(row?.country_pack_code ?? null);
  }, [selectedPropertyId, properties, setCountryPackCode]);
}
