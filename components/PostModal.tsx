"use client";

import { useEffect } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import PostCarousel from "./PostCarousel";
import CommentsPanel from "./CommentsPanel";
import { posts as postsApi, reposts as repostsApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post } from "@/lib/types";
import { CloseIcon, MoreIcon, RepostIcon, TrashIcon } from "./Icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

/** Instagram-style post dialog: media (carousel/video) on the left, comments on the right. */
export default function PostModal({
  post,
  onClose,
  isRepost = false,
  onDeleted,
}: {
  post: Post;
  onClose: () => void;
  isRepost?: boolean;
  onDeleted?: () => void;
}) {
  const { user } = useAuth();
  const images = post.images?.length ? post.images : [];
  const canDelete = !!user && post.userId === user.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function deletePost() {
    try {
      await postsApi.remove(post.postId);
      onDeleted?.();
      onClose();
    } catch {
      /* ignore */
    }
  }

  async function removeRepost() {
    if (!user) return;
    try {
      await repostsApi.remove(user.id, post.postId);
      onDeleted?.();
      onClose();
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 md:p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 text-white/80 hover:text-white"
      >
        <CloseIcon size={28} />
      </button>

      <div
        className="flex h-full max-h-screen w-full max-w-5xl flex-col overflow-hidden bg-black md:max-h-[92vh] md:flex-row md:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* media */}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
          {images.length ? (
            <PostCarousel images={images} alt={post.title ?? ""} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-lg text-neutral-300">
              {post.content || post.title || "…"}
            </div>
          )}
        </div>

        {/* comments column */}
        <div className="flex h-1/2 w-full shrink-0 flex-col border-t border-line md:h-auto md:w-[400px] md:border-l md:border-t-0">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Link href={`/u/${post.userId}`}>
              <Avatar src={post.userImage} name={post.userName} size={36} />
            </Link>
            <Link href={`/u/${post.userId}`} className="flex-1 text-sm font-semibold hover:opacity-70">
              {post.userName}
            </Link>
            {(isRepost || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Post options" className="outline-none">
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
          </div>
          <div className="min-h-0 flex-1">
            <CommentsPanel postId={post.postId} initial={post.comments ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
