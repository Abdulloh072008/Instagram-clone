"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PostCard from "@/components/PostCard";
import StoriesBar from "@/components/StoriesBar";
import Suggestions from "@/components/Suggestions";
import { posts as postsApi, notInterested as notInterestedApi, blocks as blocksApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post } from "@/lib/types";

const PAGE_SIZE = 6;

export default function HomeFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<Post[]>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const seen = useRef<Set<number>>(new Set());
  const sentinel = useRef<HTMLDivElement>(null);

  // Скрытые «не интересует» посты — тянем один раз, чтобы фильтровать ленту.
  useEffect(() => {
    if (!user?.id) return;
    notInterestedApi
      .list(user.id)
      .then((res) => setHidden(new Set(res.data ?? [])))
      .catch(() => {});
    blocksApi
      .list(user.id)
      .then((res) => setBlockedUsers(new Set(res.data ?? [])))
      .catch(() => {});
  }, [user?.id]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await postsApi.feed(p, PAGE_SIZE);
      setTotalPage(res.totalPage ?? 1);
      const fresh = (res.data ?? []).filter((post) => {
        if (seen.current.has(post.postId)) return false;
        seen.current.add(post.postId);
        return true;
      });
      setItems((prev) => [...prev, ...fresh]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPage) {
          const nextPage = page + 1;
          setPage(nextPage);
          load(nextPage);
        }
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, totalPage, loading, load]);

  return (
    <div className="flex justify-center gap-8">
      <div className="w-full max-w-[630px] px-0 py-4 md:px-4">
        <StoriesBar />
        <div className="mt-4 flex flex-col gap-6">
          {items
            .filter((post) => !hidden.has(post.postId) && !blockedUsers.has(post.userId))
            .map((post) => (
              <PostCard key={post.postId} post={post} />
            ))}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
          </div>
        )}
        {!loading && page >= totalPage && items.length > 0 && (
          <p className="py-10 text-center text-sm text-neutral-600">You&apos;re all caught up ✨</p>
        )}
        <div ref={sentinel} className="h-4" />
      </div>

      <Suggestions />
    </div>
  );
}
