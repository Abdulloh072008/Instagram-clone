"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import FollowButton from "@/components/FollowButton";
import FollowRequests from "@/components/FollowRequests";
import { notifications as notifApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { BellIcon } from "@/components/Icons";

function notifText(n: AppNotification): string {
  switch (n.type) {
    case "like":
      return "liked your post.";
    case "comment":
      return n.text ? `commented: ${n.text}` : "commented on your post.";
    case "follow":
      return "started following you.";
    case "mention":
      return n.text || "mentioned you.";
    default:
      return "sent you a notification.";
  }
}

type Bucket = "Today" | "This Week" | "Earlier";
function bucketOf(dateStr: string): Bucket {
  const d = new Date(dateStr).getTime();
  const days = (Date.now() - d) / 86_400_000;
  if (days < 1) return "Today";
  if (days < 7) return "This Week";
  return "Earlier";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(true); // false when backend endpoint not live yet

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    notifApi
      .list(uid, 1, 40)
      .then((res) => {
        if (!alive) return;
        setItems(res.data ?? []);
        setReady(true);
        // Clear the unread badge once the user opens this page.
        notifApi.markAllRead(uid).catch(() => {});
      })
      .catch(() => {
        // Backend endpoint not implemented yet -> show a graceful empty state.
        if (alive) setReady(false);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const groups = useMemo(() => {
    const order: Bucket[] = ["Today", "This Week", "Earlier"];
    const map: Record<Bucket, AppNotification[]> = { Today: [], "This Week": [], Earlier: [] };
    for (const n of items) map[bucketOf(n.createdAt)].push(n);
    return order.filter((b) => map[b].length).map((b) => ({ label: b, list: map[b] }));
  }, [items]);

  return (
    <div className="mx-auto max-w-[600px] px-2 py-6 md:px-4">
      <h1 className="mb-4 px-2 text-2xl font-bold">Notifications</h1>
      <FollowRequests />

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white">
            <BellIcon size={40} />
          </div>
          <p className="text-lg font-semibold">Activity On Your Posts</p>
          <p className="max-w-xs text-sm text-neutral-500">
            {ready
              ? "When someone likes or comments on your posts, you'll see it here."
              : "Notifications will appear here once the backend endpoint is live."}
          </p>
        </div>
      )}

      {!loading &&
        groups.map((g) => (
          <section key={g.label} className="mb-4">
            <h2 className="px-2 py-2 text-sm font-semibold text-neutral-300">{g.label}</h2>
            <div className="flex flex-col">
              {g.list.map((n) => (
                <div
                  key={n.notificationId}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-neutral-900 ${
                    n.isRead ? "" : "bg-neutral-900/40"
                  }`}
                >
                  <Link href={`/u/${n.fromUserId}`} className="shrink-0">
                    <Avatar src={n.fromUserImage} name={n.fromUserName} size={44} />
                  </Link>
                  <p className="min-w-0 flex-1 text-sm leading-snug">
                    <Link href={`/u/${n.fromUserId}`} className="font-semibold hover:underline">
                      {n.fromUserName}
                    </Link>{" "}
                    <span className="text-neutral-300">{notifText(n)}</span>{" "}
                    <span className="text-neutral-500">{timeAgo(n.createdAt)}</span>
                  </p>

                  {n.type === "follow" ? (
                    <FollowButton userId={n.fromUserId} size="sm" />
                  ) : n.postImage ? (
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded">
                      <Img src={n.postImage} alt="post" className="h-full w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
