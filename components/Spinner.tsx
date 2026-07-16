/** Shared loading ring. Size via className, e.g. <Spinner className="h-8 w-8" />. */
export default function Spinner({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-neutral-700 border-t-white ${className}`}
    />
  );
}
