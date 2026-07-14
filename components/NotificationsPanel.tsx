"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import Img from "./Img";
import FollowButton from "./FollowButton";
import { notifications as notifApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { BellIcon } from "./Icons";

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

export default function NotificationsPanel({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(true);

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
        notifApi.markAllRead(uid).catch(() => {});
      })
      .catch(() => alive && setReady(false))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="px-6 pb-4 pt-6 text-2xl font-semibold">Notifications</h2>

      <div className="flex-1 overflow-y-auto border-t border-line">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <BellIcon size={36} className="text-neutral-500" />
            <p className="text-sm font-semibold">No notifications yet</p>
            <p className="text-xs text-neutral-500">
              {ready ? "Activity on your posts shows up here." : "Waiting for the backend endpoint."}
            </p>
          </div>
        )}

        {items.map((n) => (
          <div key={n.notificationId} className="flex items-center gap-3 px-6 py-2.5 hover:bg-neutral-900">
            <Link href={`/u/${n.fromUserId}`} onClick={onNavigate} className="shrink-0">
              <Avatar src={n.fromUserImage} name={n.fromUserName} size={44} />
            </Link>
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <Link href={`/u/${n.fromUserId}`} onClick={onNavigate} className="font-semibold hover:underline">
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
    </div>
  );
}
