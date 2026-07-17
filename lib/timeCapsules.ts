// Кэш «капсул времени»: один запрос /TimeCapsule/all на загрузку страницы,
// затем PostCard'ы читают из карты postId → дата раскрытия (ISO).
// Заблокированность считаем на клиенте (revealAt > now), чтобы не перезапрашивать.
import { timeCapsule, type CapsuleDto } from "@/lib/services";

let cache: Map<number, string> | null = null; // postId -> revealAt (ISO)
let inflight: Promise<Map<number, string>> | null = null;

async function fetchAll(): Promise<Map<number, string>> {
  const r = await timeCapsule.all().catch(() => ({ data: [] as CapsuleDto[] }));
  cache = new Map((r.data ?? []).map((c) => [c.postId, c.revealAt]));
  return cache;
}

/** Карта капсул (кэшируется; параллельные вызовы делят один запрос). */
export function getCapsuleMap(): Promise<Map<number, string>> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) inflight = fetchAll().finally(() => (inflight = null));
  return inflight;
}

/** Локально обновить кэш после set/remove, чтобы UI не ждал перезагрузки. */
export function setLocalCapsule(postId: number, revealAt: string | null): void {
  if (!cache) cache = new Map();
  if (revealAt) cache.set(postId, revealAt);
  else cache.delete(postId);
}

/** Человекочитаемый остаток до раскрытия, напр. «2d 4h» / «12m». */
export function untilLabel(revealAtIso: string, nowMs = Date.now()): string {
  let s = Math.max(0, Math.floor((new Date(revealAtIso).getTime() - nowMs) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
