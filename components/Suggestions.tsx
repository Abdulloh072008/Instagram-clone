"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { users } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { UserListItem } from "@/lib/types";

export default function Suggestions() {
  const { user } = useAuth();
  const [list, setList] = useState<UserListItem[]>([]);

  useEffect(() => {
    users
      .list(1, 8)
      .then((res) => setList((res.data ?? []).filter((u) => u.userName !== user?.userName)))
      .catch(() => {});
  }, [user?.userName]);

  return (
    <div className="hidden w-[320px] shrink-0 px-4 py-8 lg:block">
      {/* current user */}
      <div className="mb-6 flex items-center gap-3">
        <Avatar name={user?.userName} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.userName}</p>
          <p className="truncate text-sm text-neutral-500">{user?.email}</p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-400">Suggested for you</span>
        <button className="text-xs font-semibold">See All</button>
      </div>

      <div className="flex flex-col gap-3">
        {list.map((u) => (
          <div key={u.id} className="flex items-center gap-3">
            <Link href={`/u/${u.id}`}>
              <Avatar src={u.avatar} name={u.userName} size={40} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/u/${u.id}`} className="block truncate text-sm font-semibold hover:opacity-70">
                {u.userName}
              </Link>
              <p className="truncate text-xs text-neutral-500">
                {u.fullName || `${u.subscribersCount} followers`}
              </p>
            </div>
            <FollowButton userId={u.id} size="sm" />
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs leading-5 text-neutral-600">
        About · Help · Press · API · Jobs · Privacy · Terms
        <br />© {new Date().getFullYear()} INSTAGRAM CLONE · SOFTCLUB API
      </p>
    </div>
  );
}
