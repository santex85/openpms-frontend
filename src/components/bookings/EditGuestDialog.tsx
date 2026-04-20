import { useTranslation } from "react-i18next";

import { GuestProfileForm } from "@/components/guests/GuestProfileForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCountryPackExtensions } from "@/hooks/useCountryPackExtensions";
import { useGuest } from "@/hooks/useGuest";
import { formatApiError } from "@/lib/formatApiError";

interface EditGuestDialogProps {
  guestId: string | null;
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGuestDialog({
  guestId,
  bookingId,
  open,
  onOpenChange,
}: EditGuestDialogProps) {
  const { t } = useTranslation();
  const { data: packExtensions } = useCountryPackExtensions(open);
  const {
    data: guest,
    isPending,
    isError,
    error,
  } = useGuest(open && guestId !== null && guestId !== "" ? guestId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t("bookings.editGuestTitle", { defaultValue: "Редактировать гостя" })}
          </DialogTitle>
          <DialogDescription>
            {t("bookings.editGuestDescription", {
              defaultValue:
                "Изменения сохраняются в профиле гостя и отображаются во всех бронях.",
            })}
          </DialogDescription>
        </DialogHeader>
        {guestId === null || guestId === "" ? (
          <p className="text-sm text-muted-foreground">
            {t("bookings.editGuestNoId", { defaultValue: "Гость не выбран." })}
          </p>
        ) : isError ? (
          <p className="text-sm text-destructive" role="alert">
            {formatApiError(error)}
          </p>
        ) : isPending || guest === undefined ? (
          <div
            className="h-40 animate-pulse rounded-md bg-muted"
            aria-busy
            aria-label={t("common.loading", { defaultValue: "Загрузка" })}
          />
        ) : (
          <GuestProfileForm
            variant="dialog"
            guest={guest}
            guestId={guestId}
            packExtensions={packExtensions}
            onClose={() => {
              onOpenChange(false);
            }}
            bookingId={bookingId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
