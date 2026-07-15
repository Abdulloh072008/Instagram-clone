"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Avatar from "./Avatar";
import PostCarousel from "./PostCarousel";
import PostModal from "./PostModal";
import { posts as postsApi, reposts as repostsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { timeAgo, formatCount } from "@/lib/utils";
import type { Post, PostComment } from "@/lib/types";
import {
  HeartIcon,
  HeartFilled,
  CommentIcon,
  ShareIcon,
  RepostIcon,
  BookmarkIcon,
  BookmarkFilled,
  MoreIcon,
  TrashIcon,
} from "./Icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export default function PostCard({
  post,
  isRepost = false,
  onDeleted,
}: {
  post: Post;
  isRepost?: boolean;
  onDeleted?: () => void;
}) {
  const { user } = useAuth();
  const [deleted, setDeleted] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [liked, setLiked] = useState(post.postLike);
  const [likeCount, setLikeCount] = useState(post.postLikeCount);
  const [saved, setSaved] = useState(post.postFavorite);
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showModal, setShowModal] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<{ draft: string }>({ defaultValues: { draft: "" } });

  const images = post.images?.length ? post.images : [];

  // Reflect whether the current user already reposted this post (green vs white).
  useEffect(() => {
    if (!user) return;
    let alive = true;
    repostsApi
      .state(post.postId, user.id)
      .then((res) => alive && setReposted(Boolean(res.data?.mine)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [post.postId, user?.id]);

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

  const canDelete = !!user && post.userId === user.id;

  async function deletePost() {
    try {
      await postsApi.remove(post.postId);
      setDeleted(true);
      onDeleted?.();
    } catch {
      /* ignore */
    }
  }

  async function removeRepost() {
    if (!user) return;
    try {
      await repostsApi.remove(user.id, post.postId);
      setDeleted(true);
      onDeleted?.();
    } catch {
      /* ignore */
    }
  }

  // ponytail: optimistic toggle, initial repost state not prefetched to avoid a request per feed post.
  async function toggleRepost() {
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

  const visibleComments = comments.slice(0, 2);

  if (deleted) return null;

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
        {(isRepost || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Post options"
              className="text-neutral-300 outline-none hover:text-white"
            >
              <MoreIcon size={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isRepost && (
                <DropdownMenuItem onSelect={removeRepost} className="font-semibold text-ig-red">
                  <RepostIcon size={18} /> Remove repost
                </DropdownMenuItem>
              )}
              {isRepost && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem onSelect={deletePost} className="font-semibold text-ig-red">
                  <TrashIcon size={18} /> Delete post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* media */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-950 md:rounded-none">
        {images.length > 0 ? (
          <PostCarousel images={images} alt={post.title ?? ""} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-lg text-neutral-300">
            {post.content || post.title || "…"}
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex items-center gap-4 px-3 pt-3">
        <button
          onClick={toggleLike}
          className={`transition active:scale-90 ${liked ? "" : "hover:text-neutral-400"}`}
        >
          {liked ? <HeartFilled size={26} className="text-ig-red" /> : <HeartIcon size={26} />}
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="transition hover:text-neutral-400 active:scale-90"
        >
          <CommentIcon size={26} />
        </button>
        <button className="transition hover:text-neutral-400 active:scale-90">
          <ShareIcon size={24} />
        </button>
        <button
          onClick={toggleRepost}
          className={`transition active:scale-90 ${reposted ? "text-green-500" : "hover:text-neutral-400"}`}
        >
          <RepostIcon size={25} />
        </button>
        <button
          onClick={toggleSave}
          className={`ml-auto transition active:scale-90 ${saved ? "" : "hover:text-neutral-400"}`}
        >
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
      {commentCount > 2 && (
        <button
          onClick={() => setShowModal(true)}
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

      {showModal && <PostModal post={{ ...post, comments }} onClose={() => setShowModal(false)} />}
    </article>
  );
}
