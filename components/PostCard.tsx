"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Avatar from "./Avatar";
import PostCarousel from "./PostCarousel";
import PostModal from "./PostModal";
import { posts as postsApi, reposts as repostsApi, notInterested as notInterestedApi, timeCapsule } from "@/lib/services";
import { getCapsuleMap, setLocalCapsule, untilLabel } from "@/lib/timeCapsules";
import { toast } from "@/lib/toast";
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
  const [revealAt, setRevealAt] = useState<string | null>(null);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
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

  // Time Capsule: заблокирован ли этот пост до даты раскрытия.
  useEffect(() => {
    let alive = true;
    getCapsuleMap()
      .then((m) => alive && setRevealAt(m.get(post.postId) ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [post.postId]);

  const locked = revealAt != null && new Date(revealAt).getTime() > nowMs;

  // Пока пост заблокирован — тикаем раз в 30с (обратный отсчёт + авто-раскрытие).
  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [locked]);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await postsApi.like(post.postId);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast(next ? "Couldn't like that post" : "Couldn't unlike that post");
    }
  }

  const canDelete = !!user && post.userId === user.id;
  const canHide = !!user && post.userId !== user.id; // "не интересует" — только чужие посты

  async function notInterested() {
    if (user) notInterestedApi.add(user.id, post.postId).catch(() => {});
    setDeleted(true);
    onDeleted?.();
  }

  async function saveCapsule(revealIso: string) {
    if (!user) return;
    try {
      await timeCapsule.set(post.postId, user.id, revealIso);
      setLocalCapsule(post.postId, revealIso);
      setRevealAt(revealIso);
      setNowMs(Date.now());
      setCapsuleOpen(false);
      toast("Time capsule set", "ok");
    } catch {
      toast("Couldn't set the time capsule");
    }
  }

  async function removeCapsule() {
    try {
      await timeCapsule.remove(post.postId);
      setLocalCapsule(post.postId, null);
      setRevealAt(null);
      toast("Time capsule removed", "ok");
    } catch {
      toast("Couldn't remove the time capsule");
    }
  }

  async function deletePost() {
    try {
      await postsApi.remove(post.postId);
      setDeleted(true);
      onDeleted?.();
    } catch {
      toast("Couldn't delete the post");
    }
  }

  async function removeRepost() {
    if (!user) return;
    try {
      await repostsApi.remove(user.id, post.postId);
      setDeleted(true);
      onDeleted?.();
    } catch {
      toast("Couldn't remove the repost");
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
      toast(next ? "Couldn't repost" : "Couldn't remove the repost");
    }
  }

  async function toggleSave() {
    setSaved((s) => !s);
    try {
      await postsApi.favorite(post.postId);
    } catch {
      setSaved((s) => !s);
      toast("Couldn't update your saved posts");
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
      toast("Couldn't post your comment");
    }
  });

  const visibleComments = [...comments]
    .sort((a, b) => +new Date(b.dateCommented) - +new Date(a.dateCommented))
    .slice(0, 2);

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
        {(isRepost || canDelete || canHide) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Post options"
              className="text-neutral-300 outline-none hover:text-white"
            >
              <MoreIcon size={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canHide && (
                <DropdownMenuItem onSelect={notInterested} className="font-semibold">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
                  </svg>
                  Not interested
                </DropdownMenuItem>
              )}
              {canHide && (isRepost || canDelete) && <DropdownMenuSeparator />}
              {isRepost && (
                <DropdownMenuItem onSelect={removeRepost} className="font-semibold text-ig-red">
                  <RepostIcon size={18} /> Remove repost
                </DropdownMenuItem>
              )}
              {isRepost && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem onSelect={() => setCapsuleOpen(true)} className="font-semibold">
                  <ClockGlyph /> {revealAt ? "Edit time capsule" : "Make time capsule"}
                </DropdownMenuItem>
              )}
              {canDelete && revealAt && (
                <DropdownMenuItem onSelect={removeCapsule} className="font-semibold">
                  Remove time capsule
                </DropdownMenuItem>
              )}
              {canDelete && <DropdownMenuSeparator />}
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
        {locked ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-neutral-900 px-6 text-center">
            <LockGlyph />
            <p className="text-sm font-semibold text-neutral-200">Time capsule</p>
            <p className="text-xs text-neutral-400">
              Unlocks in {untilLabel(revealAt!, nowMs)}
              <br />
              <span className="text-neutral-500">{new Date(revealAt!).toLocaleString()}</span>
            </p>
          </div>
        ) : images.length > 0 ? (
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
      {capsuleOpen && (
        <CapsuleDialog initial={revealAt} onClose={() => setCapsuleOpen(false)} onSave={saveCapsule} />
      )}
    </article>
  );
}

function LockGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-300"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CapsuleDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: string | null;
  onClose: () => void;
  onSave: (iso: string) => void;
}) {
  // <input type="datetime-local"> wants local wall-clock "YYYY-MM-DDTHH:mm".
  const toLocalInput = (iso: string | null) => {
    const d = iso ? new Date(iso) : new Date(Date.now() + 3_600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [val, setVal] = useState(() => toLocalInput(initial));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-elevated p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold">Time capsule</h3>
        <p className="mb-4 text-xs text-neutral-400">
          Hide this post until the date you choose — it unlocks automatically.
        </p>
        <input
          type="datetime-local"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800">
            Cancel
          </button>
          <button
            onClick={() => {
              if (val && new Date(val).getTime() > Date.now()) onSave(new Date(val).toISOString());
            }}
            disabled={!val}
            className="rounded-lg bg-ig-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ig-blue-hover disabled:opacity-50"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
