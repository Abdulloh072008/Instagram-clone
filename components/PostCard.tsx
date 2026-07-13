"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Avatar from "./Avatar";
import Img from "./Img";
import { posts as postsApi } from "@/lib/services";
import { timeAgo, formatCount } from "@/lib/utils";
import type { Post, PostComment } from "@/lib/types";
import {
  HeartIcon,
  HeartFilled,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  BookmarkFilled,
  MoreIcon,
} from "./Icons";

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.postLike);
  const [likeCount, setLikeCount] = useState(post.postLikeCount);
  const [saved, setSaved] = useState(post.postFavorite);
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showAllComments, setShowAllComments] = useState(false);
  const [slide, setSlide] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<{ draft: string }>({ defaultValues: { draft: "" } });

  const images = post.images?.length ? post.images : [];

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await postsApi.like(post.postId);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function toggleSave() {
    setSaved((s) => !s);
    try {
      await postsApi.favorite(post.postId);
    } catch {
      setSaved((s) => !s);
    }
  }

  const submitComment = handleSubmit(async ({ draft }) => {
    const text = draft.trim();
    if (!text) return;
    try {
      await postsApi.addComment(post.postId, text);
      const optimistic: PostComment = {
        postCommentId: Date.now(),
        userId: "me",
        userName: "You",
        userImage: null,
        dateCommented: new Date().toISOString(),
        comment: text,
      };
      setComments((c) => [optimistic, ...c]);
      setCommentCount((c) => c + 1);
      reset();
    } catch {
      /* ignore */
    }
  });

  const visibleComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <article className="mx-auto w-full max-w-[470px] border-b border-line pb-3 md:rounded-lg md:border md:pb-0">
      {/* header */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link href={`/u/${post.userId}`}>
          <Avatar src={post.userImage} name={post.userName} size={36} ring />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/u/${post.userId}`} className="text-sm font-semibold hover:opacity-70">
            {post.userName}
          </Link>
          <span className="ml-1 text-sm text-neutral-500">· {timeAgo(post.datePublished)}</span>
          {post.title && <p className="truncate text-xs text-neutral-400">{post.title}</p>}
        </div>
        <button className="text-neutral-300 hover:text-white">
          <MoreIcon size={20} />
        </button>
      </header>

      {/* media */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-950 md:rounded-none">
        {images.length > 0 ? (
          <Img src={images[slide]} alt={post.title ?? ""} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-lg text-neutral-300">
            {post.content || post.title || "…"}
          </div>
        )}

        {images.length > 1 && (
          <>
            <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs">
              {slide + 1}/{images.length}
            </div>
            {slide > 0 && (
              <button
                onClick={() => setSlide((s) => s - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm"
              >
                ‹
              </button>
            )}
            {slide < images.length - 1 && (
              <button
                onClick={() => setSlide((s) => s + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm"
              >
                ›
              </button>
            )}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === slide ? "bg-ig-blue" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* actions */}
      <div className="flex items-center gap-4 px-3 pt-3">
        <button onClick={toggleLike} className="transition active:scale-90">
          {liked ? <HeartFilled size={26} className="text-ig-red" /> : <HeartIcon size={26} />}
        </button>
        <button
          onClick={() => setShowAllComments(true)}
          className="transition hover:text-neutral-400"
        >
          <CommentIcon size={26} />
        </button>
        <button className="transition hover:text-neutral-400">
          <ShareIcon size={24} />
        </button>
        <button onClick={toggleSave} className="ml-auto transition active:scale-90">
          {saved ? <BookmarkFilled size={24} /> : <BookmarkIcon size={24} />}
        </button>
      </div>

      {/* likes */}
      <div className="px-3 pt-2 text-sm font-semibold">{formatCount(likeCount)} likes</div>

      {/* caption */}
      {(post.content || post.title) && (
        <p className="px-3 pt-1 text-sm">
          <Link href={`/u/${post.userId}`} className="mr-1.5 font-semibold">
            {post.userName}
          </Link>
          {post.content || post.title}
        </p>
      )}

      {/* comments */}
      {commentCount > 2 && !showAllComments && (
        <button
          onClick={() => setShowAllComments(true)}
          className="px-3 pt-1 text-sm text-neutral-500"
        >
          View all {formatCount(commentCount)} comments
        </button>
      )}
      <div className="px-3 pt-1">
        {visibleComments.map((c) => (
          <p key={c.postCommentId} className="text-sm">
            <Link href={`/u/${c.userId}`} className="mr-1.5 font-semibold">
              {c.userName}
            </Link>
            {c.comment}
          </p>
        ))}
      </div>

      {/* add comment */}
      <form
        onSubmit={submitComment}
        className="mt-2 flex items-center gap-2 border-t border-line px-3 py-2.5"
      >
        <input
          {...register("draft")}
          placeholder="Add a comment…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={!watch("draft")?.trim() || isSubmitting}
          className="text-sm font-semibold text-ig-blue disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </article>
  );
}
