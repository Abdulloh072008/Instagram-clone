import { cn } from "@/lib/utils";

/** Pulsing placeholder block. Shape and size come from className. */
export default function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-neutral-900", className)} />;
}

/** Feed post: header, media, action row, caption. */
export function PostCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-3 md:px-0">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="aspect-square w-full rounded-none md:rounded-lg" />
      <div className="flex flex-col gap-2 px-3 md:px-0">
        <div className="flex gap-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/** 3-column media grid (explore, profile tabs). */
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-none" />
      ))}
    </div>
  );
}

/** Avatar + two text lines, repeated (chat list, notifications, suggestions). */
export function RowsSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Avatar row of circles (stories bar). */
export function StoriesBarSkeleton() {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-line px-3 py-4 md:rounded-lg md:border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <Skeleton className="h-[58px] w-[58px] rounded-full" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Profile header + post grid. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[935px] px-4 py-8">
      <div className="mb-10 flex items-center gap-8 md:gap-20">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full md:h-36 md:w-36" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-8">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <GridSkeleton count={9} />
    </div>
  );
}
