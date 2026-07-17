"use client";

import { useEffect, useState } from "react";
import { privacy } from "@/lib/services";
import { useAuth } from "@/lib/auth";

/** Переключатель «Приватный аккаунт» в настройках. */
export default function PrivacyToggle() {
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (user?.id) privacy.get(user.id).then((r) => setIsPrivate(Boolean(r.data?.isPrivate))).catch(() => {});
  }, [user?.id]);

  const toggle = () => {
    if (!user) return;
    const next = !isPrivate;
    setIsPrivate(next);
    privacy.set(user.id, next).catch(() => setIsPrivate(!next));
  };

  return (
    <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-elevated p-4">
      <div>
        <h2 className="text-sm font-semibold">Private account</h2>
        <p className="text-xs text-neutral-500">Only approved followers can see your posts.</p>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={isPrivate}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${isPrivate ? "bg-ig-blue" : "bg-neutral-700"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${isPrivate ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
