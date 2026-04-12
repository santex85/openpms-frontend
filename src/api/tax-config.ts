import axios from "axios";

import { apiClient } from "@/lib/api";
import type { TaxConfigPut, TaxConfigRead } from "@/types/tax-config";

export async function fetchTaxConfig(
  propertyId: string
): Promise<TaxConfigRead | null> {
  try {
    const { data } = await apiClient.get<TaxConfigRead>(
      `/properties/${propertyId}/tax-config`
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function putTaxConfig(
  propertyId: string,
  body: TaxConfigPut
): Promise<TaxConfigRead> {
  const { data } = await apiClient.put<TaxConfigRead>(
    `/properties/${propertyId}/tax-config`,
    body
  );
  return data;
}

export async function deleteTaxConfig(propertyId: string): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}/tax-config`);
}
