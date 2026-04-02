import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

import { refreshAccessTokenSingleFlight } from "@/api/auth";
import { getAccessToken } from "@/lib/authSession";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

if (import.meta.env.DEV && baseURL === "") {
  console.error(
    "[OpenPMS] VITE_API_BASE_URL is empty — requests hit the Vite origin and usually fail (CORS). Set it in .env (e.g. http://localhost:8000) and restart npm run dev."
  );
}

export interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token !== null && token !== "") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableAxiosRequestConfig | undefined;
    if (original === undefined) {
      return Promise.reject(error);
    }
    const status = error.response?.status;
    if (status !== 401) {
      return Promise.reject(error);
    }
    const url = String(original.url ?? "");
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    if (original._retry === true) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      await refreshAccessTokenSingleFlight();
      const token = getAccessToken();
      if (token !== null && token !== "") {
        original.headers.Authorization = `Bearer ${token}`;
      }
      return apiClient.request(original);
    } catch {
      toast.error("Сессия истекла. Войдите снова.");
      return Promise.reject(error);
    }
  }
);
