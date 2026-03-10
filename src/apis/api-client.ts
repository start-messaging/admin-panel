import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { STORAGE_KEYS } from "@/lib/constants";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  withCredentials: true,
});

// Request interceptor — attach Bearer token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — unwrap server envelope { success, data, pagination?, ... }
apiClient.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      "success" in response.data &&
      "data" in response.data
    ) {
      const envelope = response.data;
      response.data = envelope.pagination
        ? { data: envelope.data, pagination: envelope.pagination }
        : envelope.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    // Don't attempt token refresh if server is unreachable
    if (!error.response) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await apiClient.post("/auth/refresh");
      const newToken = data.accessToken;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError, null);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      window.location.href = "/sign-in";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// Token refresh queue
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string | null) => void;
  reject: (error: AxiosError) => void;
}[] = [];

function processQueue(error: AxiosError | null, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

// Typed helpers
export function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return apiClient.get<T>(url, config).then((r) => r.data);
}

export function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return apiClient.post<T>(url, data, config).then((r) => r.data);
}

export function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return apiClient.patch<T>(url, data, config).then((r) => r.data);
}

export function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return apiClient.delete<T>(url, config).then((r) => r.data);
}

export default apiClient;
