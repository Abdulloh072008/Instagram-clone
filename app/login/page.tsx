"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Fields = { userName: string; password: string };

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Fields>({ mode: "onChange" });

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const onSubmit = handleSubmit(async ({ userName, password }) => {
    try {
      await login(userName.trim(), password);
      router.replace("/");
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Логин ноком шуд" });
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-elevated px-8 py-10">
          <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight">Instagram</h1>
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
