"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "./Avatar";
import ComposeDialog from "./ComposeDialog";
import { chats } from "@/lib/services";
import { otherUser, previewText, sortByActivity } from "@/lib/chat";
import { useAuth } from "@/lib/auth";
import { parseApiDate, timeAgo } from "@/lib/utils";
import { RowsSkeleton } from "./Skeleton";
import { EditIcon } from "./Icons";
import type { ChatListItem } from "@/lib/types";

// Preview line + timestamp for a chat's latest message.
type Preview = { text: string; date: string };

// Fires when a message is sent so the inbox re-fetches its previews without a
// timer. The conversation page dispatches it; see messages/[id]/page.tsx.
export const CHAT_SENT_EVENT = "chat:sent";

// Kept across remounts (mobile navigates list <-> thread) so the inbox paints
// instantly from the last load, then quietly refreshes.
let cache: { list: ChatListItem[]; previews: Record<number, Preview> } | null = null;

export default function ChatList({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const activeId = params?.id ? Number(params.id) : null;
  const [list, setList] = useState<ChatListItem[]>(cache?.list ?? []);
  const [previews, setPreviews] = useState<Record<number, Preview>>(cache?.previews ?? {});
  const [loading, setLoading] = useState(!cache);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await chats.all();
      const chatList = res.data ?? [];
      // One request per chat to read its last message — the API has no bulk
      // preview endpoint. Fanned out in parallel so it's one burst, not a chain.
      const entries = await Promise.all(
        chatList.map(async (c): Promise<[number, Preview] | null> => {
          try {
            const r = await chats.byId(c.chatId);
            const msgs = r.data ?? [];
            const last = msgs[msgs.length - 1];
            if (!last) return null;
            return [c.chatId, { text: previewText(last, user?.id), date: last.sendMassageDate }];
          } catch {
            return null;
          }
        }),
      );
      const previewMap: Record<number, Preview> = {};
      for (const e of entries) if (e) previewMap[e[0]] = e[1];
      const activityAt: Record<number, number> = {};
      for (const [id, p] of Object.entries(previewMap)) activityAt[Number(id)] = parseApiDate(p.date);
      const sorted = sortByActivity(chatList, activityAt);
      cache = { list: sorted, previews: previewMap };
      setList(sorted);
      setPreviews(previewMap);
    } catch {
      /* keep whatever was cached */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load on mount; refresh when a message is sent or the tab regains focus.
  useEffect(() => {
    load();
    const onSent = () => load();
    window.addEventListener(CHAT_SENT_EVENT, onSent);
    window.addEventListener("focus", onSent);
    return () => {
      window.removeEventListener(CHAT_SENT_EVENT, onSent);
      window.removeEventListener("focus", onSent);
    };
  }, [load]);

  return (
    <div className={`flex flex-col border-r border-line ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <h2 className="text-base font-semibold">{user?.userName}</h2>
        <button
          onClick={() => setComposeOpen(true)}
          aria-label="New message"
          className="text-neutral-200 hover:text-white"
        >
          <EditIcon size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <RowsSkeleton />}
        {!loading && list.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">No conversations yet</p>
        )}
        {list.map((chat) => {
          const o = otherUser(chat, user?.id);
          const active = chat.chatId === activeId;
          const preview = previews[chat.chatId];
          return (
            <Link
              key={chat.chatId}
              href={`/messages/${chat.chatId}`}
              className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-neutral-900 ${
                active ? "bg-neutral-900" : ""
              }`}
            >
              <Avatar src={o.image} name={o.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{o.name}</p>
                <p className="truncate text-xs text-neutral-500">
                  {preview?.text ?? "No messages yet"}
                  {preview?.date && <span className="text-neutral-600"> · {timeAgo(preview.date)}</span>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {composeOpen && <ComposeDialog onClose={() => setComposeOpen(false)} />}
    </div>
  );
}
