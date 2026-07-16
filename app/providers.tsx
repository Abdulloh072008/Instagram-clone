"use client";

import { SessionProvider } from "next-auth/react";

/** Клиентские провайдеры. SessionProvider даёт useSession() в компонентах. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
