import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Axios instance for /auth/* only: cookies, no Bearer interceptor recursion. */
export const authHttp = axios.create({
  baseURL,
  withCredentials: true,
});
