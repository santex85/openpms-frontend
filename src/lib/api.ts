import axios, { type InternalAxiosRequestConfig } from "axios";

import { AUTH_STORAGE_KEY } from "@/lib/constants";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEY);
  if (token !== null && token !== "") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
