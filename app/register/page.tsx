"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const FIELDS = [
  { k: "email", ph: "Email", type: "email" },
  { k: "fullName", ph: "Full Name", type: "text" },
  { k: "userName", ph: "Username", type: "text" },
  { k: "password", ph: "Password", type: "password" },
  { k: "confirmPassword", ph: "Confirm Password", type: "password" },
] as const;

type Fields = Record<(typeof FIELDS)[number]["k"], string>;

export default function RegisterPage() {
  const { register: registerUser, login } = useAuth();
  const router = useRouter();
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Fields>({ mode: "onChange" });

  const onSubmit = handleSubmit(async (form) => {
    try {
      await registerUser(form);
      // Auto-login after successful registration.
      await login(form.userName.trim(), form.password);
      router.replace("/");
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Registration failed" });
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-elevated px-8 py-10">
          <h1 className="mb-2 text-center text-4xl font-semibold tracking-tight">Instagram</h1>
          <p className="mb-6 text-center text-sm font-medium text-neutral-400">
            Sign up to see photos and videos from your friends.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            {FIELDS.map((f) => (
              <div key={f.k} className="relative">
                <input
                  type={f.type === "password" && shown[f.k] ? "text" : f.type}
                  autoCapitalize="none"
                  placeholder={f.ph}
                  {...register(f.k, {
                    required: true,
                    validate:
                      f.k === "confirmPassword"
                        ? (v) => v === watch("password") || "Passwords do not match"
                        : undefined,
                  })}
                  className="w-full rounded-lg border border-line bg-neutral-900 px-3 py-2.5 pr-10 text-sm outline-none focus:border-neutral-500"
                />
                {f.type === "password" && (
                  <button
                    type="button"
                    onClick={() => setShown((s) => ({ ...s, [f.k]: !s[f.k] }))}
                    aria-label={shown[f.k] ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 px-3 text-neutral-400 hover:text-neutral-200"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                      {shown[f.k] && <line x1="3" y1="3" x2="21" y2="21" />}
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="mt-2 rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover disabled:opacity-50"
            >
              {isSubmitting ? "Loading…" : "Sign up"}
            </button>
            {(errors.confirmPassword || errors.root) && (
              <p className="mt-1 text-center text-sm text-ig-red">
                {errors.confirmPassword?.message ?? errors.root?.message}
              </p>
            )}
          </form>
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-elevated py-5 text-center text-sm">
          Have an account?{" "}
          <Link href="/login" className="font-semibold text-ig-blue">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
