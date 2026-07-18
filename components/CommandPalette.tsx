"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { users } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { UserListItem } from "@/lib/types";

/**
 * ⌘K / Ctrl+K command palette — быстрый переход к любой странице или человеку
 * с клавиатуры. Такого в Instagram нет; это «power-user» фича для скорости.
 */
type Cmd = { id: string; label: string; run: () => void };

export default function CommandPalette() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [people, setPeople] = useState<UserListItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Cmd[] = useMemo(
    () => [
      { id: "home", label: "Home", run: () => router.push("/") },
      { id: "explore", label: "Search / Explore", run: () => router.push("/explore") },
      { id: "reels", label: "Reels", run: () => router.push("/reels") },
      { id: "messages", label: "Messages", run: () => router.push("/messages") },
      { id: "notifications", label: "Notifications", run: () => router.push("/notifications") },
      { id: "saved", label: "Saved", run: () => router.push("/saved") },
      { id: "create", label: "Create post", run: () => router.push("/create") },
      { id: "profile", label: "My profile", run: () => router.push("/profile") },
      { id: "editprofile", label: "Edit profile", run: () => router.push("/profile/edit") },
      { id: "logout", label: "Log out", run: () => logout() },
    ],
    [router, logout],
  );

  // Открыть/закрыть по ⌘K / Ctrl+K; Esc закрывает.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setPeople([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Поиск людей (дебаунс).
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setPeople([]);
      return;
    }
    const t = setTimeout(() => {
      users.search(term, 1, 6).then((r) => setPeople(r.data ?? [])).catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const filteredCmds = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? commands.filter((c) => c.label.toLowerCase().includes(term)) : commands;
  }, [q, commands]);

  const items = useMemo(
    () => [
      ...filteredCmds.map((c) => ({ type: "cmd" as const, cmd: c })),
      ...people.map((p) => ({ type: "user" as const, user: p })),
    ],
    [filteredCmds, people],
  );

  useEffect(() => setSel(0), [items.length]);

  function run(item: (typeof items)[number]) {
    if (item.type === "cmd") item.cmd.run();
    else router.push(`/u/${item.user.id}`);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[sel]) run(items[sel]);
    }
  }

  if (!open || !user) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a page or person…"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-neutral-500"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-neutral-500">No matches</p>
          )}
          {items.map((item, i) => (
            <button
              key={item.type === "cmd" ? item.cmd.id : "u" + item.user.id}
              onClick={() => run(item)}
              onMouseEnter={() => setSel(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                i === sel ? "bg-neutral-800" : ""
              }`}
            >
              {item.type === "cmd" ? (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 text-xs text-neutral-400">
                    ⌘
                  </span>
                  <span className="flex-1">{item.cmd.label}</span>
                </>
              ) : (
                <>
                  <Avatar src={item.user.avatar} name={item.user.userName} size={24} />
                  <span className="flex-1 truncate">
                    {item.user.fullName || item.user.userName}
                    <span className="ml-1 text-xs text-neutral-500">@{item.user.userName}</span>
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-neutral-500">
          <span>↑↓ navigate</span>
          <span>⏎ open</span>
          <span>esc close</span>
          <span className="ml-auto rounded bg-neutral-800 px-1.5 py-0.5">⌘K</span>
        </div>
      </div>
    </div>
  );
}
