/**
 * API route hints in the UI (e.g. "GET /foo") are hidden for end users.
 * Enable via VITE_SHOW_API_ROUTES=true or in DEV: localStorage openpms:devUi=1
 */
export function showApiRouteHints(): boolean {
  if (import.meta.env.VITE_SHOW_API_ROUTES === "true") {
    return true;
  }
  if (
    import.meta.env.DEV &&
    typeof localStorage !== "undefined" &&
    localStorage.getItem("openpms:devUi") === "1"
  ) {
    return true;
  }
  return false;
}
