"use client";

import { useState } from "react";
import { follows } from "@/lib/services";

export default function FollowButton({
  userId,
  initialFollowing = false,
  size = "md",
  onChange,
}: {
  userId: string;
  initialFollowing?: boolean;
  size?: "sm" | "md";
  onChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

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
