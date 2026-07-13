"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register, login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    userName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await register(form);
      // Auto-login after successful registration.
      await login(form.userName.trim(), form.password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled =
    busy || !form.userName || !form.email || !form.password || !form.confirmPassword || !form.fullName;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line bg-elevated px-8 py-10">
          <h1 className="mb-2 text-center text-4xl font-semibold tracking-tight">Instagram</h1>
          <p className="mb-6 text-center text-sm font-medium text-neutral-400">
            Sign up to see photos and videos from your friends.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
            {[
              { k: "email", ph: "Email", type: "email" },
              { k: "fullName", ph: "Full Name", type: "text" },
              { k: "userName", ph: "Username", type: "text" },
              { k: "password", ph: "Password", type: "password" },
              { k: "confirmPassword", ph: "Confirm Password", type: "password" },
            ].map((f) => (
              <input
                key={f.k}
                type={f.type}
                autoCapitalize="none"
                value={form[f.k as keyof typeof form]}
                onChange={set(f.k as keyof typeof form)}
                placeholder={f.ph}
                className="rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
              />
            ))}
            <button
              type="submit"
              disabled={disabled}
              className="mt-2 rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover disabled:opacity-50"
            >
              {busy ? "Loading…" : "Sign up"}
            </button>
            {error && <p className="mt-1 text-center text-sm text-ig-red">{error}</p>}
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
