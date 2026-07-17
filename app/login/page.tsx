"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  rememberLinkedCreds,
  credForGoogleEmail,
  glinkForEmail,
  saveGcred,
  type Glink,
} from "@/lib/glink";

type Fields = { userName: string; password: string };

export default function LoginPage() {
  const { login, register: authRegister, user, loading } = useAuth();
  const { data: googleSession } = useSession();
  const router = useRouter();
  const bridging = useRef(false);
  const [showPw, setShowPw] = useState(false);
  // Привязанный аккаунт, для которого нужно ввести пароль (вход через Google).
  const [linkedAcct, setLinkedAcct] = useState<Glink | null>(null);
  const [linkPw, setLinkPw] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Fields>({ mode: "onChange" });

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  // Мостик Google → приложение. У Google-сессии нет softclub-токена, а вход идёт
  // по нему. Порядок:
  //  1) сохранённые логин/пароль привязанного аккаунта → тихий вход;
  //  2) почта привязана к аккаунту (знаем username) → просим пароль ОДИН раз;
  //  3) почта нигде не привязана → детерминированный авто-аккаунт (первый вход).
  useEffect(() => {
    if (loading || user || bridging.current) return;
    const email = googleSession?.user?.email;
    if (!email) return;
    bridging.current = true;

    (async () => {
      // (1) есть сохранённые креды привязанного аккаунта — входим тихо
      const cred = credForGoogleEmail(email);
      if (cred) {
        try {
          await login(cred.userName, cred.password);
          router.replace("/");
          return;
        } catch {
          // пароль сменили/устарел — попросим ввести заново ниже
        }
      }

      // (2) знаем, что почта привязана к аккаунту <userName> — просим его пароль
      const g = glinkForEmail(email);
      if (g) {
        setLinkedAcct(g);
        bridging.current = false; // ждём ввод пароля пользователем
        return;
      }

      // (3) почта нигде не привязана — детерминированный авто-аккаунт по почте
      const clean = email.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const uname = ("g" + clean).slice(0, 24);
      const pass = "Gg1!" + clean.slice(0, 16);
      try {
        try {
          await login(uname, pass);
        } catch {
          await authRegister({
            userName: uname,
            fullName: googleSession?.user?.name || uname,
            email,
            password: pass,
            confirmPassword: pass,
          });
          await login(uname, pass);
        }
        router.replace("/");
      } catch {
        bridging.current = false; // не вышло — оставляем обычный вход
      }
    })();
  }, [loading, user, googleSession, login, authRegister, router]);

  const onSubmit = handleSubmit(async ({ userName, password }) => {
    try {
      await login(userName.trim(), password);
      // Запомнить данные аккаунта для входа через привязанный Google (см. lib/glink).
      rememberLinkedCreds(userName.trim(), password);
      router.replace("/");
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Логин ноком шуд" });
    }
  });

  // Вход в привязанный аккаунт по введённому паролю (когда сохранённых кредов нет).
  // После успеха запоминаем — следующие входы через Google будут без пароля.
  const submitLinkedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedAcct || !linkPw) return;
    setLinkBusy(true);
    setLinkErr("");
    try {
      await login(linkedAcct.userName, linkPw);
      saveGcred(googleSession?.user?.email ?? "", linkedAcct.userName, linkPw);
      rememberLinkedCreds(linkedAcct.userName, linkPw);
      router.replace("/");
    } catch {
      setLinkErr("Неверный пароль. Попробуй ещё раз.");
      setLinkBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-elevated px-8 py-10">
          <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight">Instagram</h1>

          {linkedAcct && (
            <div className="mb-5 rounded-xl border border-ig-blue/40 bg-ig-blue/5 p-4">
              <p className="mb-3 text-sm leading-snug text-neutral-200">
                Google привязан к аккаунту <b>@{linkedAcct.userName}</b>. Введи его пароль, чтобы войти именно в него.
              </p>
              <form onSubmit={submitLinkedLogin} className="flex flex-col gap-2">
                <input
                  type="password"
                  value={linkPw}
                  onChange={(e) => setLinkPw(e.target.value)}
                  placeholder={`Пароль @${linkedAcct.userName}`}
                  autoFocus
                  className="rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
                />
                <button
                  type="submit"
                  disabled={linkBusy || !linkPw}
                  className="rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover disabled:opacity-50"
                >
                  {linkBusy ? "Вход…" : `Войти как @${linkedAcct.userName}`}
                </button>
                {linkErr && <p className="text-center text-sm text-ig-red">{linkErr}</p>}
                <button
                  type="button"
                  onClick={() => {
                    setLinkedAcct(null);
                    setLinkPw("");
                    setLinkErr("");
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-300"
                >
                  Это не мой аккаунт — войти иначе
                </button>
              </form>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            <input
              {...register("userName", { required: true })}
              placeholder="Username"
              autoCapitalize="none"
              className="rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
            />
            <div className="relative">
              <input
                {...register("password", { required: true })}
                type={showPw ? "text" : "password"}
                placeholder="Password"
                className="w-full rounded-lg border border-line bg-neutral-900 px-3 py-2.5 pr-10 text-sm outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 px-3 text-neutral-400 hover:text-neutral-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPw && <line x1="3" y1="3" x2="21" y2="21" />}
                </svg>
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="mt-2 rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover disabled:opacity-50"
            >
              {isSubmitting ? "Loading…" : "Log in"}
            </button>
            {errors.root && (
              <p className="mt-1 text-center text-sm text-ig-red">{errors.root.message}</p>
            )}
          </form>

          {/* разделитель */}
          <div className="my-5 flex items-center gap-3 text-xs font-semibold text-neutral-500">
            <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
          </div>

          {googleSession?.user ? (
            <div className="flex flex-col items-center gap-2 text-sm">
              <p className="text-neutral-300">
                Signed in with Google as <b>{googleSession.user.email ?? googleSession.user.name}</b>
              </p>
              <button onClick={() => signOut()} className="font-semibold text-ig-blue hover:underline">
                Sign out of Google
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/login" })}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continue with Google
            </button>
          )}
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-elevated py-5 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-ig-blue">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
