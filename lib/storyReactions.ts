// Local echo of what /StoryInteract/react does server-side, so the bar updates
// on tap instead of waiting for the round trip. The server upserts: one reaction
// per user per story, so picking a new emoji moves your vote rather than adding one.
import type { StoryReactions } from "./types";

export const EMPTY_REACTIONS: StoryReactions = { total: 0, summary: [], mine: null, reactions: [] };

/**
 * Toggle `emoji` for the current user. Tapping the emoji you already picked
 * clears it; tapping a different one moves your vote across.
 */
export function applyReaction(current: StoryReactions | null, emoji: string): StoryReactions {
  const r = current ?? EMPTY_REACTIONS;
  const off = r.mine === emoji;

  const counts = new Map(r.summary.map((s) => [s.emoji, s.count]));
  if (r.mine) counts.set(r.mine, (counts.get(r.mine) ?? 1) - 1);
  if (!off) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);

  // Drop emojis nobody holds anymore so they stop rendering a "0".
  const summary = [...counts]
    .filter(([, count]) => count > 0)
    .map(([e, count]) => ({ emoji: e, count }));

  return {
    ...r,
    mine: off ? null : emoji,
    summary,
    total: summary.reduce((n, s) => n + s.count, 0),
  };
}
