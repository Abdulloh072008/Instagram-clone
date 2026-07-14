import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names (shadcn convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "2h", "5d", "3w" style relative time, like Instagram. */
export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(dateStr).toLocaleDateString();
}

/** 1234 -> "1,234" */
export function formatCount(n?: number | null): string {
  return (n ?? 0).toLocaleString("en-US");
}

/** True when a media filename is a video the browser can play in <video>. */
export function isVideo(name?: string | null): boolean {
  return !!name && /\.(mp4|webm|mov|m4v|ogg)$/i.test(name);
}

/** Deterministic gradient fallback avatar color from a seed string. */
export function seedGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h} 65% 45%), hsl(${(h + 60) % 360} 65% 35%))`;
}

export function initial(name?: string | null): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}
