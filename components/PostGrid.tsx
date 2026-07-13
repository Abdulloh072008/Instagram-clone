"use client";

import { useEffect, useState } from "react";
import Img from "./Img";
import PostModal from "./PostModal";
import type { Post } from "@/lib/types";
import { HeartFilled, CommentIcon } from "./Icons";
import { formatCount } from "@/lib/utils";

export default function PostGrid({ posts, isRepost = false }: { posts: Post[]; isRepost?: boolean }) {
  const [items, setItems] = useState(posts);
  const [active, setActive] = useState<Post | null>(null);

  // Keep local list in sync when the parent swaps the posts (e.g. switching profile tabs).
  useEffect(() => setItems(posts), [posts]);

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 md:gap-1">
        {items.map((post) => (
          <button
            key={post.postId}
            onClick={() => setActive(post)}
            className="group relative aspect-square overflow-hidden bg-neutral-900"
          >
            {post.images?.[0] ? (
              <Img src={post.images[0]} alt={post.title ?? ""} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs text-neutral-400">
                {post.content || post.title || "…"}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-5 bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="flex items-center gap-1.5 font-semibold">
                <HeartFilled size={20} /> {formatCount(post.postLikeCount)}
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <CommentIcon size={20} /> {formatCount(post.commentCount)}
              </span>
            </div>
          </button>
        ))}
      </div>
      {active && (
        <PostModal
          post={active}
          isRepost={isRepost}
          onClose={() => setActive(null)}
          onDeleted={() => {
            setItems((l) => l.filter((p) => p.postId !== active.postId));
            setActive(null);
          }}
        />
      )}
    </>
  );
}
