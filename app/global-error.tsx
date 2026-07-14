"use client"; // Error boundaries must be Client Components

// global-error replaces the root layout, so it needs its own <html>/<body> and styles.
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-neutral-100 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-7xl font-black tracking-tighter text-ig-red">500</p>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Something went really wrong</h1>
            <p className="max-w-sm text-sm text-neutral-400">
              {error.message || "A critical error occurred."}
            </p>
          </div>
          <button
            onClick={() => unstable_retry()}
            className="rounded-lg bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
