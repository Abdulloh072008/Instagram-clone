"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { users } from "@/lib/services";
import { formatCount } from "@/lib/utils";
import type { UserListItem } from "@/lib/types";
import { SearchIcon, CloseIcon } from "./Icons";

export default function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    debounce.current = setTimeout(() => {
      users
        .search(query.trim(), 1, 20)
        .then((res) => setResults(res.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 350);
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-6">
        <h2 className="mb-6 text-2xl font-semibold">Search</h2>
        <div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2.5">
          <SearchIcon size={16} className="text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            autoCapitalize="none"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-neutral-400">
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-line">
        {busy && <p className="px-6 py-4 text-sm text-neutral-500">Searching…</p>}
        {!busy && query.trim() && results.length === 0 && (
          <p className="px-6 py-4 text-sm text-neutral-500">No results found.</p>
        )}
        {!query.trim() && (
          <p className="px-6 py-4 text-sm text-neutral-500">Search for people by username.</p>
        )}
        {results.map((u) => (
          <Link
            key={u.id}
            href={`/u/${u.id}`}
            onClick={onNavigate}
            className="flex items-center gap-3 px-6 py-2 hover:bg-neutral-900"
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
  );
}
