import { create } from "zustand";

interface OnboardingModalState {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useOnboardingModalStore = create<OnboardingModalState>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));
