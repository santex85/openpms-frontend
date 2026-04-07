import axios from "axios";

/** Extract `missing_fields` from FastAPI 422 when check-in validation fails. */
export function parseCheckInMissingFields(err: unknown): string[] | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 422) {
    return null;
  }
  const data = err.response.data;
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const detail = (data as { detail?: unknown }).detail;
  if (
    typeof detail === "object" &&
    detail !== null &&
    "missing_fields" in detail
  ) {
    const mf = (detail as { missing_fields: unknown }).missing_fields;
    if (Array.isArray(mf) && mf.every((x): x is string => typeof x === "string")) {
      return mf;
    }
  }
  return null;
}
