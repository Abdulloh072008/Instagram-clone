"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { chats, users } from "@/lib/services";
import { toast } from "@/lib/toast";
import { CloseIcon, SearchIcon } from "./Icons";
import type { UserListItem } from "@/lib/types";

/**
 * "New message" dialog: search people and open a chat with one. Fills the gap
 * where the inbox invited you to start a chat but gave no way to — the only
 * other entry point is a user's profile.
 */
export default function ComposeDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape, like every other IG dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  async function startChat(userId: string) {
    if (starting) return;
    setStarting(true);
    try {
      const res = await chats.create(userId);
      const chatId = typeof res.data === "number" ? res.data : undefined;
      onClose();
      router.push(chatId ? `/messages/${chatId}` : "/messages");
    } catch {
      toast("Couldn't start that chat");
      setStarting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">New message</h2>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 text-neutral-300">
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2">
            <SearchIcon size={16} className="text-neutral-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              autoCapitalize="none"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {busy && <p className="px-4 py-4 text-sm text-neutral-500">Searching…</p>}
          {!busy && query.trim() && results.length === 0 && (
            <p className="px-4 py-4 text-sm text-neutral-500">No results found.</p>
          )}
          {!query.trim() && (
            <p className="px-4 py-4 text-sm text-neutral-500">Search for someone to message.</p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u.id)}
              disabled={starting}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-neutral-800 disabled:opacity-50"
            >
              <Avatar src={u.avatar} name={u.userName} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.userName}</p>
                <p className="truncate text-sm text-neutral-500">{u.fullName}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
