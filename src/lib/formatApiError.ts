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
        const msgs = d
          .map((item) =>
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof (item as { msg: unknown }).msg === "string"
              ? (item as { msg: string }).msg
              : null
          )
          .filter((s): s is string => s !== null && s !== "");
        if (msgs.length > 0) {
          return msgs.join(" ");
        }
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
