"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import { followRequests } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { formatCount } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

/** Закрытый профиль: контент скрыт, доступна только кнопка запроса на подписку. */
export default function LockedProfile({
  userId, profile, initialStatus,
}: {
  userId: string; profile: UserProfile; initialStatus: string;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState(initialStatus); // none | pending | approved
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.userName;

  const request = () => {
    if (!user) return;
    if (status === "pending") {
      setStatus("none");
      followRequests.cancel(user.id, userId).catch(() => setStatus("pending"));
    } else {
      setStatus("pending");
      followRequests.create(user.id, user.userName, user.image ?? null, userId).catch(() => setStatus("none"));
    }
  };

  return (
    <div className="mx-auto max-w-[935px] px-4 py-6">
      <header className="flex flex-col items-center gap-6 border-b border-line pb-8 sm:flex-row sm:items-start sm:gap-14 sm:pl-8">
        <Avatar src={profile.image} name={profile.userName} size={150} className="shrink-0" />
        <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-light">{profile.userName}</h1>
            <button
              onClick={request}
              className={`rounded-lg px-5 py-1.5 text-sm font-semibold ${
                status === "pending" ? "bg-neutral-800 hover:bg-neutral-700" : "bg-ig-blue text-white hover:bg-ig-blue-hover"
              }`}
            >
              {status === "pending" ? "Requested" : "Follow"}
            </button>
          </div>
          <div className="flex gap-8 text-sm">
            <span><b>{formatCount(profile.postCount)}</b> posts</span>
            <span><b>{formatCount(profile.subscribersCount)}</b> followers</span>
            <span><b>{formatCount(profile.subscriptionsCount)}</b> following</span>
          </div>
          <p className="text-sm font-semibold">{fullName}</p>
        </div>
      </header>

      <div className="flex flex-col items-center gap-2 border-t border-line py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <p className="font-semibold">This account is private</p>
        <p className="text-sm text-neutral-500">Follow to see their photos and videos.</p>
      </div>
    </div>
  );
}
