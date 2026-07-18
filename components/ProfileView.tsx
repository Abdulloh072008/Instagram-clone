"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import PostGrid from "./PostGrid";
import FollowButton from "./FollowButton";
import ProfileActions from "./ProfileActions";
import Highlights from "./Highlights";
import ProfileMusic from "./ProfileMusic";
import { chats, reposts as repostsApi, posts as postsApi, profiles } from "@/lib/services";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { formatCount } from "@/lib/utils";
import type { Post, UserProfile } from "@/lib/types";
import {
  GridIcon,
  ReelsIcon,
  RepostIcon,
  TaggedIcon,
  MoreIcon,
  BellIcon,
  BookmarkIcon,
  LogoutIcon,
  SettingsIcon,
  PlusIcon,
} from "./Icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

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
  const { logout, user } = useAuth();
  const [tab, setTab] = useState<"posts" | "reels" | "reposts" | "tagged">("posts");
  const [reposts, setReposts] = useState<Post[] | null>(null);
  const [followers, setFollowers] = useState(profile.subscribersCount);
  // Инлайн-редактирование описания прямо в профиле (без ухода в Edit profile).
  const [bio, setBio] = useState(profile.about ?? "");
  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const genderNum = profile.gender === "Female" ? 1 : 0;

  function startEditBio() {
    setDraftBio(bio);
    setEditingBio(true);
  }
  async function saveBio() {
    setSavingBio(true);
    try {
      await profiles.update(draftBio.trim(), genderNum);
      setBio(draftBio.trim());
      setEditingBio(false);
      toast("Bio updated", "ok");
    } catch {
      toast("Couldn't update bio");
    } finally {
      setSavingBio(false);
    }
  }

  useEffect(() => {
    if (tab !== "reposts" || reposts !== null) return;
    // ponytail: resolve each repost's postId to a full Post so they render like real posts.
    repostsApi
      .byUser(userId)
      .then((res) => res.data ?? [])
      .then((list) =>
        Promise.all(list.map((r) => postsApi.byId(r.postId).then((p) => p.data).catch(() => null))),
      )
      .then((list) => setReposts(list.filter((p): p is Post => !!p)))
      .catch(() => setReposts([]));
  }, [tab, reposts, userId]);
  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.userName;

  async function message() {
    try {
      const res = await chats.create(userId);
      const chatId = typeof res.data === "number" ? res.data : undefined;
      router.push(chatId ? `/messages/${chatId}` : "/messages");
    } catch {
      toast("Couldn't open that chat");
      router.push("/messages");
    }
  }

  return (
    <div className="relative mx-auto max-w-[935px] px-4 py-6">
      {/* Options menu — top-right corner (own profile), like real Instagram */}
      {isMe && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Options"
            className="absolute right-4 top-5 z-10 rounded-lg p-1.5 text-neutral-200 outline-none hover:bg-neutral-800"
          >
            <MoreIcon size={26} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push("/notifications")}>
              <BellIcon size={18} /> Your activity
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/saved")}>
              <BookmarkIcon size={18} /> Saved
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} className="font-semibold text-ig-red">
              <LogoutIcon size={18} /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* header */}
      <header className="flex flex-col items-center gap-6 border-b border-line pb-8 sm:flex-row sm:items-start sm:gap-14 sm:pl-8">
        <Avatar
          src={isMe && user?.image !== undefined ? user.image : profile.image}
          name={profile.userName}
          size={150}
          className="shrink-0"
        />

        <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-light">{profile.userName}</h1>
            {isMe ? (
              <Link
                href="/profile/edit"
                aria-label="Settings"
                title="Settings"
                className="gear-btn rounded-lg p-1.5 text-neutral-200 transition hover:bg-neutral-800"
              >
                <SettingsIcon size={24} className="gear-ico" />
              </Link>
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
                <ProfileActions userId={userId} />
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
            {editingBio ? (
              <div className="mt-1 w-full max-w-sm">
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Write a bio…"
                  className="w-full resize-none rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={saveBio}
                    disabled={savingBio}
                    className="rounded-md bg-ig-blue px-3 py-1 text-xs font-semibold text-white hover:bg-ig-blue-hover disabled:opacity-50"
                  >
                    {savingBio ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingBio(false)}
                    className="rounded-md px-3 py-1 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : bio ? (
              <p className="whitespace-pre-line">
                {bio}
                {isMe && (
                  <button
                    onClick={startEditBio}
                    className="ml-2 align-middle text-xs font-semibold text-ig-blue hover:underline"
                  >
                    Edit
                  </button>
                )}
              </p>
            ) : isMe ? (
              <button
                onClick={startEditBio}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ig-blue hover:underline"
              >
                <PlusIcon size={16} /> Add bio
              </button>
            ) : null}
          </div>

          <ProfileMusic userId={userId} isMe={isMe} />
        </div>
      </header>

      {/* highlights */}
      <Highlights userId={userId} isMe={isMe} />

      {/* tabs */}
      <div className="flex justify-center gap-12 border-b border-line">
        {[
          { k: "posts", label: "POSTS", Icon: GridIcon },
          { k: "reels", label: "REELS", Icon: ReelsIcon },
          { k: "reposts", label: "REPOSTS", Icon: RepostIcon },
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
        ) : tab === "reposts" ? (
          reposts === null ? (
            <p className="py-16 text-center text-neutral-500">Loading…</p>
          ) : reposts.length > 0 ? (
            <PostGrid posts={reposts} isRepost />
          ) : (
            <p className="py-16 text-center text-neutral-500">No reposts yet</p>
          )
        ) : (
          <p className="py-16 text-center text-neutral-500">Nothing here yet</p>
        )}
      </div>
    </div>
  );
}
