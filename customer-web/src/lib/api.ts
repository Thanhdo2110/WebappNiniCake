/** API client dùng chung cho customer-web: token + refresh tự động + unwrap envelope */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { ApiEnvelope, ApiErrorBody, ApiSuccess } from '@shared/types';

export const TOKEN_KEY = 'nc_access_token';

export const instance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ---------- Refresh token đơn trị (chỉ 1 request / lần) ---------- */
let refreshInFlight: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        const body = res.data as ApiEnvelope<{ accessToken: string }>;
        if (body?.success && body.data?.accessToken) {
          localStorage.setItem(TOKEN_KEY, body.data.accessToken);
          return body.data.accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const url = config?.url || '';
    if (status === 401 && config && !config._retried && !SKIP_REFRESH_PATHS.some((p) => url.includes(p))) {
      config._retried = true;
      const token = await requestRefresh();
      if (token) {
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
        return instance.request(config);
      }
      clearToken();
      window.dispatchEvent(new CustomEvent('nc:auth-expired'));
    }
    return Promise.reject(error);
  }
);

/* ---------- Helpers ---------- */
export function errMessage(e: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  const ax = e as AxiosError<ApiErrorBody>;
  const body = ax?.response?.data;
  if (body && !body.success && body.message) return body.message;
  if (body && (body as ApiErrorBody).message) return (body as ApiErrorBody).message;
  if (!(e instanceof AxiosError)) {
    const msg = (e as { message?: string })?.message;
    if (msg) return msg;
  }
  return fallback;
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await instance.get<ApiSuccess<T>>(url, { params });
  return res.data.data;
}

export async function getWithMessage<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<{ data: T; message?: string }> {
  const res = await instance.get<ApiSuccess<T>>(url, { params });
  return { data: res.data.data, message: res.data.message };
}

export async function post<T>(url: string, body?: unknown): Promise<{ data: T; message?: string }> {
  const res = await instance.post<ApiSuccess<T>>(url, body ?? {});
  return { data: res.data.data, message: res.data.message };
}

export async function put<T>(url: string, body?: unknown): Promise<{ data: T; message?: string }> {
  const res = await instance.put<ApiSuccess<T>>(url, body ?? {});
  return { data: res.data.data, message: res.data.message };
}

export async function patch<T>(url: string, body?: unknown): Promise<{ data: T; message?: string }> {
  const res = await instance.patch<ApiSuccess<T>>(url, body ?? {});
  return { data: res.data.data, message: res.data.message };
}

export async function del<T>(url: string, params?: Record<string, unknown>): Promise<{ data: T; message?: string }> {
  const res = await instance.delete<ApiSuccess<T>>(url, { params });
  return { data: res.data.data, message: res.data.message };
}

/** Tải ảnh tham khảo lên server (yêu cầu đã đăng nhập) */
export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await instance.post<ApiSuccess<{ url: string }>>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
