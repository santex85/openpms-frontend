import { getAccessToken, getSessionEpoch } from "@/lib/authSession";

/** Fragment for React Query keys so caches reset when the session changes. */
export function authQueryKeyPart(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const token = getAccessToken();
  const prefix = token !== null && token !== "" ? token.slice(0, 12) : "";
  return `${getSessionEpoch()}:${prefix}`;
}
