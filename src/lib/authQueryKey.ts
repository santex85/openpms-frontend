import { AUTH_STORAGE_KEY } from "@/lib/constants";

/** Fragment for React Query keys so caches reset when the Bearer token changes. */
export function authQueryKeyPart(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(AUTH_STORAGE_KEY) ?? "";
}
