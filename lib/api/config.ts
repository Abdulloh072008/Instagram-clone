/**
 * Базовый адрес API. Можно переопределить через переменную окружения
 * NEXT_PUBLIC_API_URL (например для локального бэка или стейджинга).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://instagram-api.softclub.tj";

/** Ключ, под которым JWT-токен лежит в localStorage. */
export const TOKEN_STORAGE_KEY = "ig_access_token";
