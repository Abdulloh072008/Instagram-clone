/**
 * Базовый адрес API. Можно переопределить через переменную окружения
 * NEXT_PUBLIC_API_URL (например для локального бэка или стейджинга).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://instagram-api.softclub.tj";

/**
 * Дополнительный бэкенд (наш, на C#): сюда уходят запросы, которые сломаны
 * в основном API (например Location/update-Location). Переопределяется через
 * NEXT_PUBLIC_EXTRA_API_URL.
 */
export const EXTRA_API_BASE_URL =
  process.env.NEXT_PUBLIC_EXTRA_API_URL?.replace(/\/$/, "") ??
  "https://instagramextraapi.onrender.com";

/** Ключ, под которым JWT-токен лежит в localStorage. */
export const TOKEN_STORAGE_KEY = "ig_access_token";

/**
 * Полный URL к загруженному файлу (фото постов, аватарки, сторис).
 * Бэк в ответах отдаёт только имя файла, а раздаёт их из /images/.
 */
export function mediaUrl(fileName?: string | null): string {
  if (!fileName) return "";
  if (/^https?:\/\//.test(fileName)) return fileName;
  return `${API_BASE_URL}/images/${fileName}`;
}
