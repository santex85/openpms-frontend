import { apiClient } from "@/lib/api";
import type {
  CountryPackExtensionCreate,
  CountryPackExtensionRead,
} from "@/types/country-pack";

export async function fetchCountryPackExtensions(): Promise<
  CountryPackExtensionRead[]
> {
  const { data } = await apiClient.get<CountryPackExtensionRead[]>(
    "/country-packs/extensions"
  );
  return data;
}

export async function createCountryPackExtension(
  body: CountryPackExtensionCreate
): Promise<CountryPackExtensionRead> {
  const { data } = await apiClient.post<CountryPackExtensionRead>(
    "/country-packs/extensions",
    body
  );
  return data;
}

export async function deleteCountryPackExtension(id: string): Promise<void> {
  await apiClient.delete(`/country-packs/extensions/${encodeURIComponent(id)}`);
}
