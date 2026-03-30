import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  postFolioCharge,
  postFolioPayment,
  postFolioReversal,
  type FolioChargeCreate,
  type FolioPaymentCreate,
  type FolioReversalCreate,
} from "@/api/folio";
import { authQueryKeyPart } from "@/lib/authQueryKey";

function folioKey(bookingId: string) {
  const authKey = authQueryKeyPart();
  return ["bookings", "folio", authKey, bookingId] as const;
}

export function useFolioCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { bookingId: string; body: FolioChargeCreate }) =>
      postFolioCharge(args.bookingId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: folioKey(args.bookingId) });
    },
  });
}

export function useFolioPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { bookingId: string; body: FolioPaymentCreate }) =>
      postFolioPayment(args.bookingId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: folioKey(args.bookingId) });
    },
  });
}

export function useFolioReversal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { bookingId: string; body: FolioReversalCreate }) =>
      postFolioReversal(args.bookingId, args.body),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: folioKey(args.bookingId) });
    },
  });
}
