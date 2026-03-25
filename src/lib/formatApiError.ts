import axios from "axios";

/** Human-readable message for failed API calls (FastAPI detail or status). */
export function formatApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === "object" && data !== null && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") {
        return d;
      }
      if (Array.isArray(d)) {
        return JSON.stringify(d);
      }
    }
    if (err.response?.statusText) {
      return `${err.response.status} ${err.response.statusText}`;
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Неизвестная ошибка";
}
