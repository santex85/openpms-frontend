/** Show API route hints in the UI (GET /… blocks). */
export function showApiRouteHints(): boolean {
  if (import.meta.env.VITE_SHOW_API_ROUTES === "true") {
    return true;
  }
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return window.localStorage.getItem("openpms:devUi") === "1";
  }
  return false;
}
