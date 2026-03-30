import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "openpms_theme";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "light";
}

function applyToDocument(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

const initialMode = readStoredMode();
applyToDocument(initialMode);

interface ThemeStoreState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  mode: initialMode,
  setMode: (mode) => {
    applyToDocument(mode);
    set({ mode });
  },
  toggle: () => {
    const next = get().mode === "dark" ? "light" : "dark";
    get().setMode(next);
  },
}));
