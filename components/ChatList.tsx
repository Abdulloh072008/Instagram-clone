"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "./Avatar";
import { chats } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { ChatListItem } from "@/lib/types";

export function otherUser(chat: ChatListItem, myId?: string) {
  const iAmSender = chat.sendUserId === myId;
  return {
    id: iAmSender ? chat.receiveUserId : chat.sendUserId,
    name: iAmSender ? chat.receiveUserName : chat.sendUserName,
    image: iAmSender ? chat.receiveUserImage : chat.sendUserImage,
  };
}

export default function ChatList({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const activeId = params?.id ? Number(params.id) : null;
  const [list, setList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chats
      .all()
      .then((res) => setList(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`flex flex-col border-r border-line ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <h2 className="text-base font-semibold">{user?.userName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-2.5">
              <div className="h-12 w-12 shrink-0 rounded-full bg-neutral-900" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-neutral-900" />
                <div className="h-2.5 w-1/2 rounded bg-neutral-900" />
              </div>
            </div>
          ))}
        {!loading && list.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">No conversations yet</p>
        )}
        {list.map((chat) => {
          const o = otherUser(chat, user?.id);
          const active = chat.chatId === activeId;
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
                <p className="truncate text-xs text-neutral-500">Tap to open chat</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
