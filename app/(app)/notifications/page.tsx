"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import { RowsSkeleton } from "@/components/Skeleton";
import { posts as postsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { buildActivity, groupActivity, type ActivityItem } from "@/lib/activity";
import { BellIcon } from "@/components/Icons";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    postsApi
      .mine()
      .then((res) => {
        if (!alive) return;
        setItems(buildActivity(res ?? [], uid));
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const groups = useMemo(() => groupActivity(items), [items]);

  return (
    <div className="mx-auto max-w-[600px] px-2 py-6 md:px-4">
      <h1 className="mb-4 px-2 text-2xl font-bold">Your activity</h1>

      {loading && <RowsSkeleton count={8} className="-mx-2" />}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white">
            <BellIcon size={40} />
          </div>
          <p className="text-lg font-semibold">Activity On Your Posts</p>
          <p className="max-w-xs text-sm text-neutral-500">
            When someone comments on your posts, you&apos;ll see it here.
          </p>
        </div>
      )}

      {!loading &&
        groups.map((g) => (
          <section key={g.label} className="mb-4">
            <h2 className="px-2 py-2 text-sm font-semibold text-neutral-300">{g.label}</h2>
            <div className="flex flex-col">
              {g.list.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-neutral-900"
                >
                  <Link href={`/u/${it.fromUserId}`} className="shrink-0">
                    <Avatar src={it.fromUserImage} name={it.fromUserName} size={44} />
                  </Link>
                  <p className="min-w-0 flex-1 text-sm leading-snug">
                    <Link href={`/u/${it.fromUserId}`} className="font-semibold hover:underline">
                      {it.fromUserName}
                    </Link>{" "}
                    <span className="text-neutral-300">{it.text}</span>{" "}
                    <span className="text-neutral-500">{timeAgo(it.createdAt)}</span>
                  </p>

                  {it.postImage ? (
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded">
                      <Img src={it.postImage} alt="post" className="h-full w-full object-cover" />
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
