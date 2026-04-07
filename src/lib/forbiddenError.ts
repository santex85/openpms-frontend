import axios from "axios";

export function isAxiosForbidden(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 403;
}
