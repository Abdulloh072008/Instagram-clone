import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="bg-gradient-to-br from-neutral-100 to-neutral-600 bg-clip-text text-8xl font-black tracking-tighter text-transparent">
        404
      </p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-neutral-400">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover"
      >
        Back to home
      </Link>
    </div>
  );
}
