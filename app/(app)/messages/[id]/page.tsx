"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Skeleton from "@/components/Skeleton";
import MessageBubble from "@/components/MessageBubble";
import Composer from "@/components/Composer";
import { toast } from "@/lib/toast";
import { chats, chatExtra } from "@/lib/services";
import { otherUser, isNearBottom, threadChanged, buildThread, mergeThread } from "@/lib/chat";
import { CHAT_SENT_EVENT } from "@/components/ChatList";
import { useAuth } from "@/lib/auth";
import type { ChatMessage, ExtraMessage, GifItem, MessageKind, UnifiedMessage } from "@/lib/types";
import { BackIcon, PhoneIcon, VideoIcon } from "@/components/Icons";

// Uneven widths so the loading thread reads as chat rather than a stack of bars.
const BUBBLE_WIDTHS = ["w-40", "w-28", "w-52", "w-36", "w-24", "w-44", "w-32"];

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const { user } = useAuth();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [peer, setPeer] = useState<{ id: string; name: string; image: string | null } | null>(null);
  // Optimistic messages shown before the server confirms them. Negative id
  // marks them as still sending and keeps them from colliding with real ids.
  // Kept apart from `messages` so the 5s poll can't wipe them.
  const [pending, setPending] = useState<UnifiedMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // First paint jumps to the bottom instantly; later updates only follow if you
  // were already there. Without this the 5s poll yanks you down mid-scroll.
  const firstPaintRef = useRef(true);

  const rows = useMemo(
    () => buildThread([...messages, ...pending], user?.id),
    [messages, pending, user?.id],
  );

  const loadMessages = useCallback(async () => {
    try {
      // Both stores in parallel; either failing alone still shows the other.
      const [main, extra] = await Promise.all([
        chats.byId(chatId).then((r) => r.data ?? []).catch(() => [] as ChatMessage[]),
        chatExtra.get(chatId).then((r) => r.data ?? []).catch(() => [] as ExtraMessage[]),
      ]);
      const next = mergeThread(main, extra);
      // Keep the old array reference when nothing changed, so effects keyed on
      // `messages` don't re-run every poll (scroll, and the reaction observer).
      setMessages((prev) => (threadChanged(prev, next) ? next : prev));
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Resolve peer info from the chat list.
  useEffect(() => {
    chats
      .all()
      .then((res) => {
        const chat = (res.data ?? []).find((c) => c.chatId === chatId);
        if (chat) setPeer(otherUser(chat, user?.id));
      })
      .catch(() => {});
  }, [chatId, user?.id]);

  // Switching chats without unmounting: treat the new chat as a fresh load so
  // it shows its skeleton and jumps to the bottom instead of inheriting the old.
  useEffect(() => {
    setMessages([]);
    setPending([]);
    setLoading(true);
    firstPaintRef.current = true;
  }, [chatId]);

  // Initial + polling load.
  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    if (loading) return;
    if (firstPaintRef.current) {
      // Jump, don't animate, on the first load — smooth-scrolling a full thread
      // from the top is a visible swoop every time you open a chat.
      bottomRef.current?.scrollIntoView();
      firstPaintRef.current = false;
      return;
    }
    if (scrollRef.current && isNearBottom(scrollRef.current)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Sending your own message always scrolls you to it, wherever you were.
  useEffect(() => {
    if (pending.length) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pending.length]);

  // Show an optimistic bubble, run the send, then reconcile: on success reload
  // (which replaces the temp with the real message) and nudge the inbox; on
  // failure toast and drop the temp. Shared by every send path below.
  const dispatchSend = useCallback(
    (optimistic: UnifiedMessage, send: Promise<unknown>, failMsg: string) => {
      setPending((p) => [...p, optimistic]);
      (async () => {
        try {
          await send;
          await loadMessages();
          window.dispatchEvent(new Event(CHAT_SENT_EVENT));
        } catch {
          toast(failMsg);
        } finally {
          setPending((p) => p.filter((m) => m.id !== optimistic.id));
        }
      })();
    },
    [loadMessages],
  );

  // Build an optimistic message for the current user. `store` follows the kind:
  // text/image live in main /Chat, everything else in the ChatExtra store.
  const optimisticFor = useCallback(
    (kind: MessageKind, patch: Partial<UnifiedMessage>): UnifiedMessage => {
      const tempId = -Date.now();
      return {
        key: `t${tempId}`,
        store: kind === "text" || kind === "image" ? "main" : "extra",
        id: tempId,
        userId: user?.id ?? "",
        userName: user?.userName ?? "",
        userImage: user?.image ?? null,
        text: "",
        file: null,
        kind,
        at: Date.now(),
        date: new Date().toISOString(),
        durationSec: null,
        sending: true,
        ...patch,
      };
    },
    [user],
  );

  const sendText = useCallback(
    (text: string, file: File | null) => {
      if (!user || (!text && !file)) return;
      const opt = optimisticFor(file ? "image" : "text", {
        text,
        file: file ? URL.createObjectURL(file) : null,
      });
      dispatchSend(opt, chats.send(chatId, text, file ?? undefined), "Couldn't send your message");
    },
    [user, chatId, optimisticFor, dispatchSend],
  );

  const sendGif = useCallback(
    (gif: GifItem) => {
      if (!user) return;
      const opt = optimisticFor("gif", { file: gif.url });
      dispatchSend(opt, chatExtra.send(chatId, user, "gif", { mediaUrl: gif.url }), "Couldn't send GIF");
    },
    [user, chatId, optimisticFor, dispatchSend],
  );

  const sendSticker = useCallback(
    (url: string) => {
      if (!user) return;
      const opt = optimisticFor("sticker", { file: url });
      dispatchSend(opt, chatExtra.send(chatId, user, "sticker", { mediaUrl: url }), "Couldn't send sticker");
    },
    [user, chatId, optimisticFor, dispatchSend],
  );

  const sendVoice = useCallback(
    (blob: Blob, seconds: number) => {
      if (!user) return;
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
      const opt = optimisticFor("voice", { file: URL.createObjectURL(blob), durationSec: seconds });
      dispatchSend(
        opt,
        chatExtra.sendFile(chatId, user, "voice", file, seconds),
        "Couldn't send voice message",
      );
    },
    [user, chatId, optimisticFor, dispatchSend],
  );

  return (
    <div className="flex h-screen flex-col">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/messages" className="md:hidden">
          <BackIcon size={24} />
        </Link>
        {peer && (
          <Link href={`/u/${peer.id}`} className="flex items-center gap-3">
            <Avatar src={peer.image} name={peer.name} size={40} />
            <span className="font-semibold">{peer.name}</span>
          </Link>
        )}
        <div className="ml-auto flex items-center gap-5 text-neutral-200">
          <PhoneIcon size={24} />
          <VideoIcon size={24} />
        </div>
      </header>

      {/* messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
        {loading &&
          BUBBLE_WIDTHS.map((w, i) => (
            <div key={i} className={`mb-0.5 flex ${i % 2 ? "justify-end" : "justify-start"}`}>
              <Skeleton className={`h-9 rounded-2xl ${w}`} />
            </div>
          ))}
        {!loading && messages.length === 0 && (
          <p className="my-auto text-center text-sm text-neutral-500">
            No messages yet. Say hi 👋
          </p>
        )}
        {rows.map((row) => {
          if (row.kind === "date") {
            return (
              <div key={row.key} className="my-4 text-center text-xs font-medium text-neutral-500">
                {row.label}
              </div>
            );
          }
          return (
            <MessageBubble
              key={row.key}
              m={row.msg}
              mine={row.mine}
              startsGroup={row.startsGroup}
              endsGroup={row.endsGroup}
              peerImage={peer?.image}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <Composer onText={sendText} onGif={sendGif} onSticker={sendSticker} onVoice={sendVoice} />
    </div>
  );
}
