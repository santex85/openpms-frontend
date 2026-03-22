import { apiClient } from "@/lib/api";
import type { Property } from "@/types/api";

export async function fetchProperties(): Promise<Property[]> {
  const { data } = await apiClient.get<Property[]>("/properties");
  return data;
}
