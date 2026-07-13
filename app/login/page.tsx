"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(userName.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Логин ноком шуд");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !userName || !password;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-elevated px-8 py-10">
          <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight">Instagram</h1>
          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              className="rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={disabled}
              className="mt-2 rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover disabled:opacity-50"
            >
              {busy ? "Loading…" : "Log in"}
            </button>
            {error && <p className="mt-1 text-center text-sm text-ig-red">{error}</p>}
          </form>
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
