import { apiClient } from "@/lib/api";
import type {
  CountryPackApplyResponse,
  CountryPackDetail,
  CountryPackListItem,
} from "@/types/country-pack";

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

export async function applyCountryPack(
  code: string,
  propertyId: string
): Promise<CountryPackApplyResponse> {
  const { data } = await apiClient.post<CountryPackApplyResponse>(
    `/country-packs/${encodeURIComponent(code)}/apply`,
    { property_id: propertyId }
  );
  return data;
}
