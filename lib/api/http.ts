import { API_BASE_URL } from "./config";
import { getToken } from "./auth-token";

/**
 * Обёртка ответа бэкенда. Почти все ручки возвращают именно такой конверт:
 *   { data, errors, statusCode }
 */
export interface ApiResponse<T> {
  data: T;
  errors: string[] | null;
  statusCode: number;
}

/**
 * Ответ списковых ручек с пагинацией. Помимо data содержит метаданные
 * страницы (get-posts, get-reels, get-users, get-locations и т.п.).
 */
export interface PagedResponse<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalPage: number;
  totalRecord: number;
  errors: string[] | null;
  statusCode: number;
}

/** Ошибка запроса. Кидается, если HTTP-статус не 2xx или сервер вернул errors. */
export class ApiError extends Error {
  status: number;
  errors: string[];
  body: unknown;

  constructor(message: string, status: number, errors: string[], body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Query-параметры (?key=value). undefined/null значения отбрасываются. */
  query?: Record<string, QueryValue>;
  /** Тело в формате JSON. Взаимоисключимо с formData. */
  json?: unknown;
  /** Тело в формате multipart/form-data (для загрузки файлов). */
  formData?: FormData;
  /** Нужен ли заголовок Authorization. По умолчанию true. */
  auth?: boolean;
  /** Доп. заголовки при необходимости. */
  headers?: Record<string, string>;
  /** Проброс AbortSignal для отмены запроса. */
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Низкоуровневый запрос к API. Все функции-эндпоинты ниже строятся на нём.
 *
 * - Автоматически подставляет Bearer-токен (если auth !== false и токен есть).
 * - Сам сериализует JSON и выставляет Content-Type.
 * - Для FormData Content-Type НЕ трогает (браузер сам поставит boundary).
 * - На неуспешный статус или наличие errors кидает ApiError.
 * - Возвращает распарсенное тело как T (обычно ApiResponse<...>).
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, json, formData, auth = true, headers = {}, signal } = options;

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (formData) {
    body = formData; // Content-Type проставит браузер
  } else if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body,
    signal,
  });

  // Парсим тело: пытаемся как JSON, при неудаче берём как текст.
  const raw = await response.text();
  let parsed: unknown = raw;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  const envelope = parsed as Partial<ApiResponse<unknown>> | null;
  const envelopeErrors =
    envelope && Array.isArray(envelope.errors) ? envelope.errors.filter(Boolean) : [];

  if (!response.ok) {
    const message =
      envelopeErrors[0] ??
      (typeof parsed === "string" && parsed ? parsed : `Запрос упал со статусом ${response.status}`);
    throw new ApiError(message, response.status, envelopeErrors, parsed);
  }

  return parsed as T;
}
