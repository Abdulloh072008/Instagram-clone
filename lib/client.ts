import axios, { AxiosError } from "axios";
import { API_BASE, EXTRA_API_BASE, TOKEN_KEY } from "./config";

export class ApiError extends Error {
  status: number;
  errors: string[];
  constructor(message: string, status: number, errors: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // Mirror into a cookie so a future middleware/SSR guard could read it.
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

// timeout so a hung endpoint (get-reels sometimes never responds) rejects instead of spinning forever.
const http = axios.create({ baseURL: API_BASE, timeout: 30000 });

// Attach the bearer token to every request.
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize failures into ApiError; a 401 means the session is dead — drop the token.
http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ errors?: string[]; title?: string; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const errors = data?.errors?.length
      ? data.errors
      : [data?.title || data?.message || error.message || "Request failed"];
    if (status === 401) clearToken();
    throw new ApiError(errors[0], status, errors);
  },
);

type Query = Record<string, string | number | boolean | null | undefined>;

// axios keeps null/"" params; drop them like the old buildUrl did.
function clean(query?: Query) {
  if (!query) return undefined;
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

/** Low-level verbs. Return the raw parsed JSON (envelope or paginated object). */
export const api = {
  get: <T = unknown>(path: string, query?: Query) =>
    http.get<T>(path, { params: clean(query) }).then((r) => r.data),

  postJson: <T = unknown>(path: string, body?: unknown, query?: Query) =>
    http.post<T>(path, body, { params: clean(query) }).then((r) => r.data),

  putJson: <T = unknown>(path: string, body?: unknown, query?: Query) =>
    http.put<T>(path, body, { params: clean(query) }).then((r) => r.data),

  del: <T = unknown>(path: string, query?: Query) =>
    http.delete<T>(path, { params: clean(query) }).then((r) => r.data),

  // Uploads (photos, and especially videos) can take far longer than the 30s
  // default — a longer clip would otherwise abort mid-upload. No timeout here so
  // post length isn't capped by the request timeout.
  postForm: <T = unknown>(path: string, form: FormData, query?: Query) =>
    http.post<T>(path, form, { params: clean(query), timeout: 0 }).then((r) => r.data),

  putForm: <T = unknown>(path: string, form: FormData, query?: Query) =>
    http.put<T>(path, form, { params: clean(query), timeout: 0 }).then((r) => r.data),
};

// --- Second backend (extra API: reposts). Same interceptors, different base URL. ---
const httpExtra = axios.create({ baseURL: EXTRA_API_BASE, timeout: 30000 });

httpExtra.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpExtra.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ errors?: string[]; title?: string; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const errors = data?.errors?.length
      ? data.errors
      : [data?.title || data?.message || error.message || "Request failed"];
    if (status === 401) clearToken();
    throw new ApiError(errors[0], status, errors);
  },
);

/** Same verbs as `api`, but pointed at the extra backend. */
export const extraApi = {
  get: <T = unknown>(path: string, query?: Query) =>
    httpExtra.get<T>(path, { params: clean(query) }).then((r) => r.data),

  postJson: <T = unknown>(path: string, body?: unknown, query?: Query) =>
    httpExtra.post<T>(path, body, { params: clean(query) }).then((r) => r.data),

  put: <T = unknown>(path: string, query?: Query) =>
    httpExtra.put<T>(path, undefined, { params: clean(query) }).then((r) => r.data),

  del: <T = unknown>(path: string, query?: Query) =>
    httpExtra.delete<T>(path, { params: clean(query) }).then((r) => r.data),

  postForm: <T = unknown>(path: string, form: FormData, query?: Query) =>
    httpExtra.post<T>(path, form, { params: clean(query) }).then((r) => r.data),
};
