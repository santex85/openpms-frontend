import { apiClient } from "@/lib/api";

export interface FolioChargeCategory {
  id: string;
  tenant_id: string;
  code: string;
  label: string;
  is_builtin: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FolioChargeCategoryCreate {
  code: string;
  label: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface FolioChargeCategoryUpdate {
  label?: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function fetchFolioCategories(): Promise<FolioChargeCategory[]> {
  const { data } = await apiClient.get<FolioChargeCategory[]>("/folio-categories");
  return data;
}

export async function createFolioCategory(
  body: FolioChargeCategoryCreate
): Promise<FolioChargeCategory> {
  const { data } = await apiClient.post<FolioChargeCategory>(
    "/folio-categories",
    body
  );
  return data;
}

export async function updateFolioCategory(
  code: string,
  body: FolioChargeCategoryUpdate
): Promise<FolioChargeCategory> {
  const { data } = await apiClient.patch<FolioChargeCategory>(
    `/folio-categories/${encodeURIComponent(code)}`,
    body
  );
  return data;
}

export async function deleteFolioCategory(code: string): Promise<void> {
  await apiClient.delete(`/folio-categories/${encodeURIComponent(code)}`);
}
