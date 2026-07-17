"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "./Avatar";
import { insta2, type I2Conversation, type I2User } from "@/lib/insta2";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";

function OnlineDot({ online }: { online?: boolean }) {
  if (!online) return null;
  return (
    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-black bg-green-500" />
  );
}

export default function ChatList({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const activeId = params?.id ? Number(params.id) : null;
  const [convos, setConvos] = useState<I2Conversation[]>([]);
  const [suggested, setSuggested] = useState<I2User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    insta2.chat
      .conversations()
      .then((r) => alive && setConvos(r.conversations ?? []))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    insta2.recommendations
      .users()
      .then((r) => alive && setSuggested((r.users ?? []).slice(0, 8)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const existingIds = new Set(convos.map((c) => c.user?.id));
  const startable = suggested.filter((u) => !existingIds.has(u.id));

  return (
    <div className={`flex flex-col border-r border-line ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <h2 className="text-base font-semibold">{user?.userName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-neutral-500">Loading…</p>}

        {convos.map((c) => {
          const o = c.user;
          if (!o) return null;
          const active = o.id === activeId;
          return (
            <Link
              key={c.id ?? o.id}
              href={`/messages/${o.id}`}
              className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-neutral-900 ${
                active ? "bg-neutral-900" : ""
              }`}
            >
              <div className="relative shrink-0">
                <Avatar src={o.avatarUrl} name={o.fullName || o.username} size={48} />
                <OnlineDot online={o.isOnline} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{o.fullName || o.username}</p>
                <p className="truncate text-xs text-neutral-500">
                  {c.lastMessage?.deleted
                    ? "Message deleted"
                    : c.lastMessage?.voiceUrl
                      ? "🎤 Voice message"
                      : c.lastMessage?.text || "Tap to chat"}
                  {c.lastMessage?.createdAt ? ` · ${timeAgo(c.lastMessage.createdAt)}` : ""}
                </p>
              </div>
              {!!c.unread && c.unread > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ig-blue px-1.5 text-[11px] font-bold text-white">
                  {c.unread}
                </span>
              )}
            </Link>
          );
        })}

        {!loading && startable.length > 0 && (
          <>
            <p className="px-4 pb-1 pt-4 text-xs font-semibold text-neutral-500">Suggested</p>
            {startable.map((u) => (
              <Link
                key={u.id}
                href={`/messages/${u.id}`}
                className="flex items-center gap-3 px-4 py-2 transition hover:bg-neutral-900"
              >
                <div className="relative shrink-0">
                  <Avatar src={u.avatarUrl} name={u.fullName || u.username} size={44} />
                  <OnlineDot online={u.isOnline} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.fullName || u.username}</p>
                  <p className="truncate text-xs text-neutral-500">@{u.username}</p>
                </div>
              </Link>
            ))}
          </>
        )}

        {!loading && convos.length === 0 && startable.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">No conversations yet</p>
        )}
      </div>
    </div>
  );
}
