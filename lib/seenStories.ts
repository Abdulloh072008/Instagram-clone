// Client-side story rules the API doesn't give us: "seen" memory and expiry.
// The backend records views, but the feed's get-stories doesn't tell us what
// we've already watched — so we track it locally to grey the ring and start
// playback at the first unwatched story. It also returns expired stories.
import type { StoryItem, UserStories } from "./types";

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

// Stories expire 24h after they're posted. Called at fetch time (not render) so
// the clock read stays out of the render path. An unparseable date is kept —
// dropping a story because the API sent a odd timestamp is the worse failure.
export function freshStories(groups: UserStories[]): UserStories[] {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  return groups
    .map((g) => ({
      ...g,
      stories: g.stories.filter((s) => {
        const t = Date.parse(s.createAt ?? s.dateCreated ?? "");
        return Number.isNaN(t) || t >= cutoff;
      }),
    }))
    .filter((g) => g.stories.length > 0);
}
