"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getToasts, EMPTY, type Tone } from "@/lib/toast";

// Green for something gained, red for something lost or failed.
const RED = "border-ig-red/50 bg-ig-red/15 text-red-100";
const TONE: Record<Tone, string> = {
  ok: "border-emerald-500/50 bg-emerald-500/15 text-emerald-50",
  error: RED,
  danger: RED,
};

/** Mounted once in the root layout; fed by toast() from anywhere. */
export default function Toaster() {
  const list = useSyncExternalStore(subscribe, getToasts, () => EMPTY);

  return (
    // pointer-events-none so a toast can never swallow a click meant for the UI.
    // bottom-20 clears MobileNav; the nav is gone at md, so drop back down.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 left-1/2 z-100 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 md:bottom-6"
    >
      {list.map((i) => (
        <div
          key={i.id}
          className={`animate-fade rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${TONE[i.tone]}`}
        >
          {i.text}
        </div>
      ))}
    </div>
  );
}
