// Мост «вход через Google → тот же softclub-аккаунт, к которому привязана почта».
//
// softclub — закрытое API: по Google-почте оно НЕ выдаёт токен чужого аккаунта.
// Поэтому единственный надёжный способ войти именно в привязанный аккаунт —
// заново залогиниться его логином/паролем. Пароль доступен только в момент
// обычного входа, поэтому мы сохраняем его локально (этот браузер) и связываем
// с Google-почтой. При входе через Google — берём эти данные и логинимся заново
// (свежая сессия, без «протухания» токена).
//
// Хранится device-local (localStorage). Это осознанный компромисс демо-проекта:
// пароль не покидает устройство и никуда не отправляется. См. [[account-link-flow]].

import { EXTRA_API_BASE } from "@/lib/config";
import { getToken } from "@/lib/client";

type Cred = { userName: string; password: string };

const norm = (e: string) => e.trim().toLowerCase();
const credKey = (uid: string) => "sc_cred:" + uid;
const gcredKey = (email: string) => "sc_gcred:" + norm(email);

/** userId текущей softclub-сессии из JWT (claim sid). */
function uidFromToken(): string | null {
  try {
    const t = getToken();
    if (!t) return null;
    const p = JSON.parse(atob(t.split(".")[1]));
    return p.sid ?? p.nameid ?? p.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Вызывать после успешного обычного входа. Сохраняет логин/пароль текущего
 * аккаунта и, если к нему УЖЕ привязан Google, сразу связывает эти данные с
 * Google-почтой — тогда вход через Google попадёт именно в этот аккаунт.
 */
export async function rememberLinkedCreds(userName: string, password: string): Promise<void> {
  if (typeof window === "undefined") return;
  const uid = uidFromToken();
  if (!uid) return;
  const cred: Cred = { userName, password };
  try {
    localStorage.setItem(credKey(uid), JSON.stringify(cred));
  } catch {}
  // Уже привязанный Google-аккаунт? Свяжем его почту с этими данными.
  try {
    const r = await fetch(`${EXTRA_API_BASE}/AccountLink/get?userId=${encodeURIComponent(uid)}`);
    const j = await r.json().catch(() => null);
    const links: Array<{ provider: string; email: string }> = j?.data ?? [];
    const g = links.find((l) => l.provider === "google");
    if (g?.email) localStorage.setItem(gcredKey(g.email), JSON.stringify(cred));
  } catch {}
}

/** Связать сохранённые данные текущего аккаунта с Google-почтой (при привязке в настройках). */
export function bindGoogleEmailToCurrent(userId: string, email: string): void {
  if (typeof window === "undefined" || !email) return;
  try {
    const cred = localStorage.getItem(credKey(userId));
    if (cred) localStorage.setItem(gcredKey(email), cred);
  } catch {}
}

/** Данные привязанного аккаунта по Google-почте (для входа через Google). */
export function credForGoogleEmail(email: string): Cred | null {
  if (typeof window === "undefined" || !email) return null;
  try {
    const raw = localStorage.getItem(gcredKey(email));
    return raw ? (JSON.parse(raw) as Cred) : null;
  } catch {
    return null;
  }
}
