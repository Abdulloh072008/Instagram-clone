// Client-side story rules the API doesn't give us: "seen" memory, expiry, and
// who the feed is even for. The backend records views, but the feed doesn't
// tell us what we've already watched — so we track it locally to grey the ring
// and start playback at the first unwatched story. It also returns expired
// stories, and every user's stories rather than only the ones you follow.
import { parseApiDate } from "./utils.ts";
import type { StoryItem, UserStories } from "./types";

const DAY_MS = 24 * 3600 * 1000;

const KEY = "seenStories";

/** The API is inconsistent (storyId vs id); use whichever is present. */
export function storyKey(s: StoryItem): number | undefined {
  return s.storyId ?? s.id;
}

export function loadSeen(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as number[]);
  } catch {
    return new Set();
  }
}

export function saveSeen(seen: Set<number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify([...seen]));
}

/**
 * The moment a story stops being shown. The server states it outright
 * (`expiresAt`), so use that rather than re-deciding the lifetime here; the
 * 24h-after-posting fallback only covers payloads that don't carry one. An
 * unreadable date never expires — hiding a story because the API sent an odd
 * timestamp is the worse failure.
 */
export function storyExpiry(s: StoryItem): number {
  const expires = parseApiDate(s.expiresAt);
  if (!Number.isNaN(expires)) return expires;
  const posted = parseApiDate(s.createdAt ?? s.createAt ?? s.dateCreated);
  return Number.isNaN(posted) ? Infinity : posted + DAY_MS;
}

/** Stories still live at `now`. Pass the clock in so the caller controls when it's read. */
export function freshStories(groups: UserStories[], now = Date.now()): UserStories[] {
  return groups
    .map((g) => ({ ...g, stories: g.stories.filter((s) => storyExpiry(s) > now) }))
    .filter((g) => g.stories.length > 0);
}

/**
 * When the soonest-expiring visible story runs out, so a caller can wake exactly
 * then instead of polling. Infinity when nothing on screen will ever expire.
 */
export function nextExpiry(groups: UserStories[]): number {
  let soonest = Infinity;
  for (const g of groups) for (const s of g.stories) soonest = Math.min(soonest, storyExpiry(s));
  return soonest;
}

/**
 * /StoryExtra/feed hands back every user's stories — it takes no viewer at all
 * — so the "only people I follow" rule has to be applied here. Your own stories
 * stay in regardless: they belong in your own bar.
 */
export function followedStories(
  groups: UserStories[],
  followingIds: Iterable<string>,
  meId?: string,
): UserStories[] {
  const allowed = new Set(followingIds);
  if (meId) allowed.add(meId);
  return groups.filter((g) => allowed.has(g.userId));
}
