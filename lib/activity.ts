// Real "activity" derived from data the live backend actually serves.
// The /Notification/* controller 404s, so instead of an always-empty feed we
// build activity from comments on the current user's own posts. Likes carry no
// per-user timestamp (userLikes is opaque), so comments are the only reliable
// source of "someone interacted with your post".
import { parseApiDate } from "./utils.ts";
import type { Post } from "./types";

export interface ActivityItem {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage: string | null;
  text: string;
  postId: number;
  postImage: string | null;
  createdAt: string;
}

/**
 * Flatten the comments on `posts` into a single activity feed, newest first.
 * Comments the viewer left on their own posts are skipped — that isn't activity
 * to notify yourself about.
 */
export function buildActivity(posts: Post[], myUserId: string): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const post of posts) {
    const thumb = post.images?.[0] ?? null;
    for (const c of post.comments ?? []) {
      if (c.userId === myUserId) continue;
      items.push({
        id: `c${c.postCommentId}`,
        fromUserId: c.userId,
        fromUserName: c.userName,
        fromUserImage: c.userImage,
        text: c.comment ? `commented: ${c.comment}` : "commented on your post.",
        postId: post.postId,
        postImage: thumb,
        createdAt: c.dateCommented,
      });
    }
  }
  return items.sort((a, b) => (parseApiDate(b.createdAt) || 0) - (parseApiDate(a.createdAt) || 0));
}

export type ActivityBucket = "Today" | "This Week" | "Earlier";

export function activityBucket(dateStr: string): ActivityBucket {
  const t = parseApiDate(dateStr);
  const days = (Date.now() - (Number.isNaN(t) ? 0 : t)) / 86_400_000;
  if (days < 1) return "Today";
  if (days < 7) return "This Week";
  return "Earlier";
}

/** Group activity into Today / This Week / Earlier, dropping empty sections. */
export function groupActivity(items: ActivityItem[]): { label: ActivityBucket; list: ActivityItem[] }[] {
  const order: ActivityBucket[] = ["Today", "This Week", "Earlier"];
  const map: Record<ActivityBucket, ActivityItem[]> = { Today: [], "This Week": [], Earlier: [] };
  for (const it of items) map[activityBucket(it.createdAt)].push(it);
  return order.filter((b) => map[b].length).map((b) => ({ label: b, list: map[b] }));
}
