// Client-side "seen" memory for stories. The backend records views, but the
// feed's get-stories doesn't tell us what we've already watched — so we track it
// locally to grey the ring and start playback at the first unwatched story.
import type { StoryItem } from "./types";

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
