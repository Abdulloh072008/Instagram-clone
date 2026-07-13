"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PostGrid from "@/components/PostGrid";
import { posts as postsApi, users } from "@/lib/services";
import type { Post, UserListItem } from "@/lib/types";
import { SearchIcon } from "@/components/Icons";
import { formatCount } from "@/lib/utils";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserListItem[]>([]);
  const [explore, setExplore] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Explore grid (all posts).
  useEffect(() => {
    postsApi
      .feed(1, 30)
      .then((res) => setExplore(res.data ?? []))
      .catch(() => {});
  }, []);

  // Debounced user search.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(() => {
      users
        .search(query.trim(), 1, 20)
        .then((res) => setResults(res.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
  }, [query]);

  return (
    <div className="mx-auto max-w-[935px] px-1 py-4 md:px-4">
      <div className="sticky top-0 z-10 mb-4 bg-black/90 px-2 py-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-neutral-900 px-3 py-2">
          <SearchIcon size={18} className="text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            autoCapitalize="none"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </div>
      </div>

      {query.trim() ? (
        <div className="px-2">
          {searching && <p className="py-4 text-sm text-neutral-500">Searching…</p>}
          {!searching && results.length === 0 && (
            <p className="py-4 text-sm text-neutral-500">No users found</p>
          )}
          <div className="flex flex-col gap-1">
            {results.map((u) => (
              <Link
                key={u.id}
                href={`/u/${u.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-900"
              >
                <Avatar src={u.avatar} name={u.userName} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.userName}</p>
                  <p className="truncate text-sm text-neutral-500">
                    {u.fullName} · {formatCount(u.subscribersCount)} followers
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <PostGrid posts={explore} />
      )}
    </div>
  );
}
