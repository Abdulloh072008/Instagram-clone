"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "./Avatar";
import PostGrid from "./PostGrid";
import FollowButton from "./FollowButton";
import { chats } from "@/lib/services";
import { formatCount } from "@/lib/utils";
import type { Post, UserProfile } from "@/lib/types";
import { GridIcon, ReelsIcon, TaggedIcon, SettingsIcon } from "./Icons";

export default function ProfileView({
  userId,
  profile,
  posts,
  isMe,
  isFollowing = false,
}: {
  userId: string;
  profile: UserProfile;
  posts: Post[];
  isMe: boolean;
  isFollowing?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"posts" | "reels" | "tagged">("posts");
  const [followers, setFollowers] = useState(profile.subscribersCount);
  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.userName;

  async function message() {
    try {
      const res = await chats.create(userId);
      const chatId = typeof res.data === "number" ? res.data : undefined;
      router.push(chatId ? `/messages/${chatId}` : "/messages");
    } catch {
      router.push("/messages");
    }
  }

  return (
    <div className="mx-auto max-w-[935px] px-4 py-6">
      {/* header */}
      <header className="flex flex-col items-center gap-6 border-b border-line pb-8 sm:flex-row sm:items-start sm:gap-14 sm:pl-8">
        <Avatar src={profile.image} name={profile.userName} size={150} className="shrink-0" />

        <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-light">{profile.userName}</h1>
            {isMe ? (
              <>
                <Link
                  href="/profile/edit"
                  className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-700"
                >
                  Edit profile
                </Link>
                <button className="rounded-lg bg-neutral-800 p-1.5 hover:bg-neutral-700">
                  <SettingsIcon size={18} />
                </button>
              </>
            ) : (
              <>
                <FollowButton
                  userId={userId}
                  initialFollowing={isFollowing}
                  onChange={(f) => setFollowers((c) => c + (f ? 1 : -1))}
                />
                <button
                  onClick={message}
                  className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-700"
                >
                  Message
                </button>
              </>
            )}
          </div>

          <div className="flex gap-8 text-sm">
            <span>
              <b>{formatCount(profile.postCount)}</b> posts
            </span>
            <span>
              <b>{formatCount(followers)}</b> followers
            </span>
            <span>
              <b>{formatCount(profile.subscriptionsCount)}</b> following
            </span>
          </div>

          <div className="text-center text-sm sm:text-left">
            <p className="font-semibold">{fullName}</p>
            {profile.occupation && <p className="text-neutral-400">{profile.occupation}</p>}
            {profile.about && <p className="whitespace-pre-line">{profile.about}</p>}
          </div>
        </div>
      </header>

      {/* tabs */}
      <div className="flex justify-center gap-12 border-b border-line">
        {[
          { k: "posts", label: "POSTS", Icon: GridIcon },
          { k: "reels", label: "REELS", Icon: ReelsIcon },
          { k: "tagged", label: "TAGGED", Icon: TaggedIcon },
        ].map(({ k, label, Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k as typeof tab)}
            className={`flex items-center gap-1.5 py-3 text-xs font-semibold tracking-wider ${
              tab === k ? "-mt-px border-t border-white text-white" : "text-neutral-500"
            }`}
          >
            <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* content */}
      <div className="mt-1">
        {tab === "posts" ? (
          posts.length > 0 ? (
            <PostGrid posts={posts} />
          ) : (
            <p className="py-16 text-center text-neutral-500">No posts yet</p>
          )
        ) : (
          <p className="py-16 text-center text-neutral-500">Nothing here yet</p>
        )}
      </div>
    </div>
  );
}
