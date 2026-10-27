/** API client admin-web: Bearer token + refresh NC_RT + unwrap envelope */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { ApiEnvelope, ApiErrorBody, ApiSuccess } from '@shared/types';

export const TOKEN_KEY = 'nc_admin_token';
export const USER_KEY = 'nc_admin_user';

const instance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

let refreshInFlight: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        const body = res.data as ApiEnvelope<{ accessToken: string; user: unknown }>;
        if (body?.success && body.data?.accessToken) {
          localStorage.setItem(TOKEN_KEY, body.data.accessToken);
          if (body.data.user) localStorage.setItem(USER_KEY, JSON.stringify(body.data.user));
          return body.data.accessToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    if (status === 401 && config && !config._retried && !String(config.url || '').includes('/auth/login')) {
      config._retried = true;
      const token = await requestRefresh();
      if (token) {
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
        return instance.request(config);
      }
      clearAuth();
      window.dispatchEvent(new CustomEvent('nc:admin-expired'));
    }
    return Promise.reject(error);
  }
);

export function errMessage(e: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  const ax = e as AxiosError<ApiErrorBody>;
  const body = ax?.response?.data;
  if (body?.message && !body.success) return body.message;
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

export async function del(url: string, params?: Record<string, unknown>): Promise<{ message?: string }> {
  const res = await instance.delete(url, { params });
  return { message: (res.data as ApiEnvelope<unknown>).message };
}

/** Tải file CSV trả về dạng text (dùng cho báo cáo) */
export async function getCsv(url: string, params?: Record<string, unknown>): Promise<string> {
  const res = await instance.get<string>(url, { params, responseType: 'text', transformResponse: [(d) => d] });
  return String(res.data);
}

/** Tải file upload multipart */
export async function uploadFile(file: File): Promise<{ url: string; driver: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await instance.post<{ success: boolean; data: { url: string; driver: string } }>('/admin/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
