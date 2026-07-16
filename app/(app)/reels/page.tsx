"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import FeedVideo from "@/components/FeedVideo";
import CommentsPanel from "@/components/CommentsPanel";
import Spinner from "@/components/Spinner";
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
  const [showComments, setShowComments] = useState(false);
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
    <div className="relative h-[88vh] max-h-[88vh] w-full max-w-[440px] overflow-hidden rounded-none bg-neutral-950 md:rounded-xl">
        {isVideo && media ? (
          <FeedVideo src={media} className="h-full w-full object-cover" />
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
          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center transition hover:text-neutral-400 active:scale-90"
          >
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

        {/* comments panel — right side, away from the video */}
        {showComments && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-black/50"
            onClick={() => setShowComments(false)}
          >
            <div
              className="animate-slide-right h-full w-full bg-neutral-950 sm:w-[400px]"
              onClick={(e) => e.stopPropagation()}
            >
              <CommentsPanel
                postId={post.postId}
                initial={post.comments ?? []}
                onClose={() => setShowComments(false)}
              />
            </div>
          </div>
        )}
      </div>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // get-reels is slow and sometimes hangs; small page + retry a few times before giving up.
    async function load(attempt = 0) {
      try {
        const res = await postsApi.reels(1, 8);
        const items = (res.data ?? []).filter((p) => p.images.length);
        if (!alive) return;
        if (items.length === 0 && attempt < 3) return load(attempt + 1);
        setReels(items);
        setLoading(false);
      } catch {
        if (attempt < 3) return load(attempt + 1);
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">No reels yet</div>
    );
  }

  return (
    <div className="no-scrollbar h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-y-contain">
      {reels.map((post) => (
        <div
          key={post.postId}
          className="flex h-[100dvh] snap-start snap-always items-center justify-center"
        >
          <Reel post={post} />
        </div>
      ))}
    </div>
  );
}
