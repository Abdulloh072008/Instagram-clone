"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAuth } from "@/lib/auth";
import { EXTRA_API_BASE } from "@/lib/config";

interface Link {
  id: number;
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

const REDIRECT = "/profile/edit";

async function extra<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(`${EXTRA_API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const j = await r.json();
    return j?.data ?? null;
  } catch {
    return null;
  }
}

/** Настройки → подключение и перепривязка Google-аккаунта (после обычного входа). */
export default function ConnectedAccounts() {
  const { user } = useAuth();               // пользователь softclub (обычный вход)
  const { data: gs } = useSession();        // сессия Google (NextAuth)
  const [link, setLink] = useState<Link | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!user?.id) return;
    const links = await extra<Link[]>(`/AccountLink/get?userId=${encodeURIComponent(user.id)}`);
    const g = links?.find((l) => l.provider === "google") ?? null;
    setLink(g);
    if (g) setEmail(g.email);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Привязать текущую Google-сессию к аккаунту softclub.
  const linkGoogle = async () => {
    if (!user?.id || !gs?.user) return;
    setBusy(true); setMsg("");
    const res = await fetch(`${EXTRA_API_BASE}/AccountLink/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        provider: "google",
        providerAccountId: gs.providerAccountId ?? gs.user.email ?? "",
        email: gs.user.email ?? "",
        name: gs.user.name ?? "",
        picture: gs.user.image ?? "",
      }),
    });
    const j = await res.json().catch(() => null);
    if (j?.statusCode === 200) { setMsg("Google привязан ✓"); await load(); }
    else setMsg(j?.errors?.[0] ?? "Не удалось привязать");
    setBusy(false);
  };

  const unlink = async () => {
    if (!user?.id) return;
    setBusy(true); setMsg("");
    await extra(`/AccountLink/unlink?userId=${encodeURIComponent(user.id)}&provider=google`, { method: "DELETE" });
    setLink(null); setEmail(""); setMsg("Отвязано");
    setBusy(false);
  };

  const rebind = async () => {
    if (!user?.id || !email.trim()) return;
    setBusy(true); setMsg("");
    const res = await extra<Link>(`/AccountLink/rebind-email`, {
      method: "PUT",
      body: JSON.stringify({ userId: user.id, provider: "google", email: email.trim() }),
    });
    if (res) { setLink(res); setMsg("Почта обновлена ✓"); } else setMsg("Не удалось обновить почту");
    setBusy(false);
  };

  return (
    <div className="mt-8 rounded-xl border border-line bg-elevated p-4">
      <h2 className="mb-1 text-sm font-semibold">Connected accounts</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Подключи Google к своему аккаунту (можно и после обычного входа) и при желании перепривяжи почту.
      </p>

      {loading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      ) : link ? (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-neutral-900 px-3 py-2.5">
            <GoogleGlyph />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{link.email}</p>
              <p className="text-xs text-neutral-500">Google привязан</p>
            </div>
            <button onClick={unlink} disabled={busy} className="text-sm font-semibold text-ig-red disabled:opacity-50">
              Unlink
            </button>
          </div>

          {/* перепривязка почты */}
          <label className="mb-1 mt-4 block text-xs font-semibold text-neutral-400">Re-bind email</label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new@gmail.com"
              className="flex-1 rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button
              onClick={rebind}
              disabled={busy || !email.trim() || email.trim() === link.email}
              className="rounded-lg bg-ig-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ig-blue-hover disabled:opacity-50"
            >
              Re-bind
            </button>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: REDIRECT })}
            className="mt-3 text-xs font-semibold text-ig-blue hover:underline"
          >
            Перепривязать другой Google-аккаунт
          </button>
        </>
      ) : gs?.user ? (
        // Google-сессия есть, но ещё не привязана к softclub-аккаунту
        <div className="flex items-center gap-3 rounded-lg border border-line bg-neutral-900 px-3 py-2.5">
          <GoogleGlyph />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{gs.user.email}</p>
            <p className="text-xs text-neutral-500">Google-сессия активна — привязать к аккаунту?</p>
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={linkGoogle} disabled={busy} className="rounded-md bg-ig-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              Link
            </button>
            <button onClick={() => signOut()} className="text-[11px] text-neutral-500 hover:text-neutral-300">
              выйти из Google
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => signIn("google", { callbackUrl: REDIRECT })}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
        >
          <GoogleGlyph /> Connect Google account
        </button>
      )}

      {msg && <p className="mt-3 text-sm text-neutral-400">{msg}</p>}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
