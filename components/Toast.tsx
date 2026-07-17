"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getToasts, EMPTY } from "@/lib/toast";

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
          className={`animate-fade rounded-xl border bg-elevated px-4 py-3 text-sm text-neutral-100 shadow-lg ${
            i.tone === "error" ? "border-ig-red/40" : "border-line"
          }`}
        >
          {i.text}
        </div>
      ))}
    </div>
  );
}
