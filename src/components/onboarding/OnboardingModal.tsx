import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { useOnboardingModalStore } from "@/stores/onboarding-modal-store";

export function OnboardingModal() {
  const open = useOnboardingModalStore((s) => s.open);
  const closeModal = useOnboardingModalStore((s) => s.closeModal);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeModal();
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-6 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1.5 pb-4 text-left">
          <DialogTitle>Первичная настройка</DialogTitle>
          <DialogDescription>
            Пройдите шаги по порядку. Прогресс сохраняется в браузере.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <OnboardingChecklist
            variant="modal"
            onStepNavigate={closeModal}
            onDismiss={closeModal}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
