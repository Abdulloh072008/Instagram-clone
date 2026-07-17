// Мост «вход через Google → тот же softclub-аккаунт, к которому привязана почта».
//
// softclub — закрытое API: по Google-почте оно НЕ выдаёт токен чужого аккаунта,
// а войти можно только логином+паролем. Пароль виден лишь в момент входа, поэтому:
//
//  • при обычном входе запоминаем логин/пароль локально (этот браузер);
//  • при привязке в настройках запоминаем, к какому аккаунту (userId+userName)
//    относится Google-почта — пароль там недоступен, но username мы знаем;
//  • при входе через Google: если креды сохранены — входим тихо; иначе, зная
//    что почта привязана к аккаунту <userName>, просим ввести его пароль ОДИН раз
//    и дальше запоминаем (следующие входы — без пароля).
//
// Всё хранится device-local (localStorage) и никуда не отправляется. Это
// осознанный компромисс демо-проекта — softclub федерации токенов не даёт.

type Cred = { userName: string; password: string };
export type Glink = { userId: string; userName: string };

const norm = (e: string) => e.trim().toLowerCase();
const credKey = (uid: string) => "sc_cred:" + uid;
const gcredKey = (email: string) => "sc_gcred:" + norm(email);
const glinkKey = (email: string) => "sc_glink:" + norm(email);

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Запомнить логин/пароль текущего аккаунта (вызывать после успешного входа). */
export function rememberLinkedCreds(userName: string, password: string): void {
  // Кладём и под username (для сопоставления с привязкой), чтобы вход через
  // Google в этот аккаунт стал беспарольным на этом устройстве.
  write(credKey(norm(userName)), { userName, password } satisfies Cred);
}

/** Прямо связать логин/пароль с Google-почтой (гарантированно, без бэкенда). */
export function saveGcred(email: string, userName: string, password: string): void {
  if (!email) return;
  write(gcredKey(email), { userName, password } satisfies Cred);
}

/**
 * Привязка в настройках: пароля нет, но известны userId+userName. Запоминаем,
 * к какому аккаунту относится почта, и — если пароль этого аккаунта уже был
 * сохранён при входе — сразу делаем вход через Google беспарольным.
 */
export function saveGlink(email: string, userId: string, userName: string): void {
  if (!email || !userName) return;
  write(glinkKey(email), { userId, userName } satisfies Glink);
  const cred = read<Cred>(credKey(norm(userName)));
  if (cred) saveGcred(email, cred.userName, cred.password);
}

/** Сохранённые логин/пароль привязанного аккаунта по Google-почте (для тихого входа). */
export function credForGoogleEmail(email: string): Cred | null {
  return email ? read<Cred>(gcredKey(email)) : null;
}

/** К какому аккаунту (userId+userName) привязана Google-почта — чтобы спросить пароль. */
export function glinkForEmail(email: string): Glink | null {
  return email ? read<Glink>(glinkKey(email)) : null;
}
