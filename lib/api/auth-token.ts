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

export interface CurrentUser {
  userId: string;
  userName: string;
  email: string;
  role: string;
}

/**
 * Данные текущего пользователя из JWT (без запроса к API).
 * Бэк кладёт id в claim `sid`, ник — в `name`. Удобно, чтобы понять,
 * чьи это посты/комменты и какой у тебя userId.
 */
export function getCurrentUser(): CurrentUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payloadPart = token.split(".")[1];
    const json = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json);
    return {
      userId: p.sid ?? "",
      userName: p.name ?? "",
      email: p.email ?? "",
      role: p["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? p.role ?? "",
    };
  } catch {
    return null;
  }
}
