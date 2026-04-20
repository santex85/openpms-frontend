import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createFolioCategory,
  deleteFolioCategory,
  updateFolioCategory,
  type FolioChargeCategoryCreate,
  type FolioChargeCategoryUpdate,
} from "@/api/folioCategories";
export function useCreateFolioCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FolioChargeCategoryCreate) => createFolioCategory(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["folio-categories"] });
    },
  });
}

export function useUpdateFolioCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      body,
    }: {
      code: string;
      body: FolioChargeCategoryUpdate;
    }) => updateFolioCategory(code, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["folio-categories"] });
    },
  });
}

export function useDeleteFolioCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => deleteFolioCategory(code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["folio-categories"] });
    },
  });
}
