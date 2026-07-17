"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import CallProvider from "@/components/CallProvider";
import Skeleton, { PostCardSkeleton } from "@/components/Skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Auth resolves from localStorage in one tick, so this rarely paints — it
  // covers the gap before the redirect to /login when there's no token.
  if (loading || !user) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <div className="hidden w-[245px] shrink-0 flex-col gap-7 border-r border-line p-6 md:flex">
          <Skeleton className="h-7 w-28" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
        <main className="min-w-0 flex-1 px-0 py-4 md:px-4">
          <div className="mx-auto w-full max-w-[630px]">
            <PostCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <CallProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
        <MobileNav />
      </div>
    </CallProvider>
  );
}
