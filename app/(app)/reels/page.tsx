"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import { imageUrl } from "@/lib/config";
import { posts as postsApi, reposts as repostsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { formatCount } from "@/lib/utils";
import type { Post } from "@/lib/types";
import {
  HeartIcon,
  HeartFilled,
  CommentIcon,
  ShareIcon,
  RepostIcon,
  MoreIcon,
} from "@/components/Icons";

const VIDEO_RX = /\.(mp4|webm|mov|m4v)$/i;

function Reel({ post }: { post: Post }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.postLike);
  const [count, setCount] = useState(post.postLikeCount);
  const [reposted, setReposted] = useState(false);
  const media = post.images?.[0];
  const isVideo = media ? VIDEO_RX.test(media) : false;

  async function like() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      await postsApi.like(post.postId);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  }

  // ponytail: optimistic toggle; initial repost state not prefetched.
  async function repost() {
    if (!user) return;
    const next = !reposted;
    setReposted(next);
    try {
      if (next) await repostsApi.add(post, user.id, user.userName);
      else await repostsApi.remove(user.id, post.postId);
    } catch {
      setReposted(!next);
    }
  }

  return (
    <section className="relative flex h-full w-full snap-start items-center justify-center">
      <div className="relative h-full max-h-[92vh] w-full max-w-[440px] overflow-hidden rounded-none bg-neutral-950 md:rounded-xl">
        {isVideo ? (
          <video
            src={imageUrl(media)}
            className="h-full w-full object-cover"
            loop
            muted
            playsInline
            autoPlay
          />
        ) : (
          <Img src={media} alt={post.title ?? ""} className="h-full w-full object-cover" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* right actions */}
        <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
          <button
            onClick={like}
            className={`flex flex-col items-center transition active:scale-90 ${liked ? "" : "hover:text-neutral-400"}`}
          >
            {liked ? <HeartFilled size={30} className="text-ig-red" /> : <HeartIcon size={30} />}
            <span className="mt-1 text-xs font-semibold">{formatCount(count)}</span>
          </button>
          <button className="flex flex-col items-center transition hover:text-neutral-400 active:scale-90">
            <CommentIcon size={30} />
            <span className="mt-1 text-xs font-semibold">{formatCount(post.commentCount)}</span>
          </button>
          <button
            onClick={repost}
            className={`transition active:scale-90 ${reposted ? "text-green-500" : "hover:text-neutral-400"}`}
          >
            <RepostIcon size={28} />
          </button>
          <button className="transition hover:text-neutral-400 active:scale-90">
            <ShareIcon size={28} />
          </button>
          <button className="transition hover:text-neutral-400 active:scale-90">
            <MoreIcon size={26} />
          </button>
        </div>

        {/* bottom info */}
        <div className="absolute bottom-6 left-4 right-16">
          <Link href={`/u/${post.userId}`} className="flex items-center gap-2">
            <Avatar src={post.userImage} name={post.userName} size={34} />
            <span className="text-sm font-semibold">{post.userName}</span>
          </Link>
          {(post.content || post.title) && (
            <p className="mt-2 line-clamp-2 text-sm">{post.content || post.title}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // get-reels alone often returns nothing, so also pull the feed and surface video posts.
    (async () => {
      try {
        const [reelsRes, feedRes] = await Promise.all([
          postsApi.reels(1, 20).catch(() => null),
          postsApi.feed(1, 30).catch(() => null),
        ]);
        const pool = [...(reelsRes?.data ?? []), ...(feedRes?.data ?? [])];
        const videos = pool.filter((p) => p.images?.some((m) => VIDEO_RX.test(m)));
        // Prefer real videos; if there are none, fall back to any post with media so it isn't blank.
        const chosen = videos.length ? videos : pool.filter((p) => p.images?.length);
        const seen = new Set<number>();
        setReels(chosen.filter((p) => !seen.has(p.postId) && seen.add(p.postId)));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">No reels yet</div>
    );
  }

  return (
    <div className="no-scrollbar h-screen snap-y snap-mandatory overflow-y-scroll">
      {reels.map((post) => (
        <div key={post.postId} className="h-screen py-2">
          <Reel post={post} />
        </div>
      ))}
    </div>
  );
}
