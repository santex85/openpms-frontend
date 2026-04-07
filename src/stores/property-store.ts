import { create } from "zustand";

interface PropertyStoreState {
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  countryPackCode: string | null;
  setCountryPackCode: (code: string | null) => void;
}

export const usePropertyStore = create<PropertyStoreState>((set) => ({
  selectedPropertyId: null,
  setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),
  countryPackCode: null,
  setCountryPackCode: (code) => set({ countryPackCode: code }),
}));
