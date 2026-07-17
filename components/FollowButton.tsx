"use client";

import { useEffect, useState } from "react";
import { follows, profiles } from "@/lib/services";
import { toast } from "@/lib/toast";

export default function FollowButton({
  userId,
  initialFollowing,
  size = "md",
  onChange,
}: {
  userId: string;
  /** Omit when the caller doesn't know — the button will look it up itself. */
  initialFollowing?: boolean;
  size?: "sm" | "md";
  onChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);

  // Lists (suggestions, notifications) render this without knowing whether you
  // already follow the person, so it used to claim "Follow" for everyone. Ask
  // when the caller can't say. Profile pages pass the answer in and skip this.
  // ponytail: one request per button — fine for the handful of rows these lists
  // show; if a long list ever renders them, fetch the follow set once instead.
  useEffect(() => {
    if (initialFollowing !== undefined) return;
    let alive = true;
    profiles
      .isFollowing(userId)
      .then((r) => alive && setFollowing(Boolean(r.data)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId, initialFollowing]);

  async function toggle() {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) await follows.follow(userId);
      else await follows.unfollow(userId);
      onChange?.(next);
    } catch {
      setFollowing(!next);
      toast(next ? "Couldn't follow them" : "Couldn't unfollow them");
    } finally {
      setBusy(false);
    }
  }

  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg font-semibold transition disabled:opacity-60 ${pad} ${
        following
          ? "bg-neutral-800 text-white hover:bg-neutral-700"
          : "bg-ig-blue text-white hover:bg-ig-blue-hover"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
