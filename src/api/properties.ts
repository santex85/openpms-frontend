import { apiClient } from "@/lib/api";
import type { PropertyCreate, PropertyRead } from "@/types/api";

export async function fetchProperties(): Promise<PropertyRead[]> {
  const { data } = await apiClient.get<PropertyRead[]>("/properties");
  return data;
}

export async function createProperty(
  body: PropertyCreate
): Promise<PropertyRead> {
  const { data } = await apiClient.post<PropertyRead>("/properties", body);
  return data;
}
