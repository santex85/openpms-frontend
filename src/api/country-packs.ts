import { apiClient } from "@/lib/api";
import type { CountryPackDetail, CountryPackListItem } from "@/types/country-pack";
import type { PropertyRead } from "@/types/api";

export async function fetchCountryPacks(): Promise<CountryPackListItem[]> {
  const { data } = await apiClient.get<CountryPackListItem[]>("/country-packs");
  return data;
}

export async function fetchCountryPackByCode(
  code: string
): Promise<CountryPackDetail> {
  const { data } = await apiClient.get<CountryPackDetail>(
    `/country-packs/${encodeURIComponent(code)}`
  );
  return data;
}

export async function applyCountryPack(code: string): Promise<PropertyRead> {
  const { data } = await apiClient.post<PropertyRead>(
    `/country-packs/${encodeURIComponent(code)}/apply`
  );
  return data;
}
