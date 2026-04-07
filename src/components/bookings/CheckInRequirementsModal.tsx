import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CheckInRequirementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: string[];
  guestId: string | null;
}

export function CheckInRequirementsModal({
  open,
  onOpenChange,
  missingFields,
  guestId,
}: CheckInRequirementsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("checkIn.requirementsTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("checkIn.requirementsIntro")}
        </p>
        <ul className="list-inside list-disc text-sm text-foreground">
          {missingFields.map((f) => (
            <li key={f} className="font-mono text-xs">
              {f}
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={guestId === null}
            onClick={() => {
              onOpenChange(false);
              if (guestId !== null) {
                navigate(`/guests/${guestId}#extension-fields`);
              }
            }}
          >
            {t("checkIn.editGuestProfile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
