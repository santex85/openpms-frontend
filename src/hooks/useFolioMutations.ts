import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  deleteFolioTransaction,
  postFolioEntry,
  type FolioEntryCreate,
} from "@/api/folio";
import { authQueryKeyPart } from "@/lib/authQueryKey";

function folioKey(bookingId: string) {
  const authKey = authQueryKeyPart();
  return ["bookings", "folio", authKey, bookingId] as const;
}

export function useFolioEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { bookingId: string; body: FolioEntryCreate }) =>
      postFolioEntry(args.bookingId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: folioKey(args.bookingId) });
    },
  });
}

export function useFolioDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { bookingId: string; transactionId: string }) =>
      deleteFolioTransaction(args.bookingId, args.transactionId),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: folioKey(args.bookingId) });
    },
  });
}
