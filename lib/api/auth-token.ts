import { TOKEN_STORAGE_KEY } from "./config";

/**
 * Хранилище JWT-токена.
 *
 * Держим токен в памяти (чтобы работало и на сервере) и дублируем в
 * localStorage на клиенте, чтобы он переживал перезагрузку страницы.
 * Все запросы, требующие авторизации, автоматически подставляют этот токен.
 */

let inMemoryToken: string | null = null;

const isBrowser = typeof window !== "undefined";

/** Сохранить токен (обычно после login/register). */
export function setToken(token: string | null): void {
  inMemoryToken = token;
  if (!isBrowser) return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/** Получить текущий токен (из памяти или из localStorage). */
export function getToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (isBrowser) {
    inMemoryToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return inMemoryToken;
}

/** Удалить токен (logout). */
export function clearToken(): void {
  setToken(null);
}

/** Есть ли сейчас пользователь авторизован. */
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
