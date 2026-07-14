"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="bg-gradient-to-br from-ig-red to-neutral-600 bg-clip-text text-7xl font-black tracking-tighter text-transparent">
        Oops
      </p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-neutral-400">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-lg bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg bg-neutral-800 px-5 py-2.5 text-sm font-semibold transition hover:bg-neutral-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
