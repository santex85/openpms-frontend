import { create } from "zustand";

export type ThemeMode = "light" | "neutral" | "dark";

const STORAGE_KEY = "openpms_theme";

const MODE_ORDER: ThemeMode[] = ["light", "neutral", "dark"];

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "neutral") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "light";
}

function applyToDocument(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove("dark", "neutral");
  if (mode === "dark") {
    root.classList.add("dark");
  } else if (mode === "neutral") {
    root.classList.add("neutral");
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
    const current = get().mode;
    const idx = MODE_ORDER.indexOf(current);
    const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
    get().setMode(next);
  },
}));
