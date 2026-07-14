import { API_BASE, TOKEN_KEY } from "./config";

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

type Query = Record<string, string | number | boolean | null | undefined>;

const isAbsolute = (path: string) => /^https?:\/\//.test(path);

function buildUrl(path: string, query?: Query): string {
  // Absolute paths (e.g. the companion backend) are used as-is; relative
  // paths are resolved against the main API base.
  const url = new URL(isAbsolute(path) ? path : API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const errors: string[] = json?.errors?.length
      ? json.errors
      : [json?.title || json?.message || res.statusText || "Request failed"];
    // 401 -> session is dead, drop the token so guards can react.
    if (res.status === 401) clearToken();
    throw new ApiError(errors[0], res.status, errors);
  }
  return json;
}

async function send(path: string, init: RequestInit, query?: Query): Promise<unknown> {
  const token = getToken();
  const headers = new Headers(init.headers);
  // The companion backend (absolute URLs) has no auth; don't send the JWT there
  // (avoids an unnecessary CORS preflight on the Authorization header).
  if (token && !isAbsolute(path)) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(buildUrl(path, query), { ...init, headers });
  return parse(res);
}

function jsonBody(body: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/** Low-level verbs. Return the raw parsed JSON (envelope or paginated object). */
export const api = {
  get: <T = unknown>(path: string, query?: Query) => send(path, { method: "GET" }, query) as Promise<T>,

  postJson: <T = unknown>(path: string, body?: unknown, query?: Query) =>
    send(path, { method: "POST", ...(body !== undefined ? jsonBody(body) : {}) }, query) as Promise<T>,

  putJson: <T = unknown>(path: string, body?: unknown, query?: Query) =>
    send(path, { method: "PUT", ...(body !== undefined ? jsonBody(body) : {}) }, query) as Promise<T>,

  del: <T = unknown>(path: string, query?: Query) => send(path, { method: "DELETE" }, query) as Promise<T>,

  postForm: <T = unknown>(path: string, form: FormData, query?: Query) =>
    send(path, { method: "POST", body: form }, query) as Promise<T>,

  putForm: <T = unknown>(path: string, form: FormData, query?: Query) =>
    send(path, { method: "PUT", body: form }, query) as Promise<T>,
};
