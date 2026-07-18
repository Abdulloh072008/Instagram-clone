"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Skeleton from "@/components/Skeleton";
import MessageBubble from "@/components/MessageBubble";
import Composer from "@/components/Composer";
import { useCall } from "@/components/CallProvider";
import { toast } from "@/lib/toast";
import { chats, chatExtra, presence } from "@/lib/services";
import { otherUser, isNearBottom, threadChanged, buildThread, mergeThread, latestPeerSeen, SEEN_MARKER } from "@/lib/chat";
import { CHAT_SENT_EVENT } from "@/components/ChatList";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import type { ChatMessage, ExtraMessage, GifItem, MessageKind, UnifiedMessage } from "@/lib/types";
import { BackIcon, PhoneIcon, VideoIcon } from "@/components/Icons";

// Uneven widths so the loading thread reads as chat rather than a stack of bars.
const BUBBLE_WIDTHS = ["w-40", "w-28", "w-52", "w-36", "w-24", "w-44", "w-32"];

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const { user } = useAuth();
  const { startCall, busy: callBusy } = useCall();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [peer, setPeer] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [peerPresence, setPeerPresence] = useState<{ online: boolean; lastSeenAt: string } | null>(null);
  // Optimistic messages shown before the server confirms them. Negative id
  // marks them as still sending and keeps them from colliding with real ids.
  // Kept apart from `messages` so the 5s poll can't wipe them.
  const [pending, setPending] = useState<UnifiedMessage[]>([]);
  // When the peer last read the thread (epoch-ms, 0 = never), from their "seen"
  // markers. Neither API has real receipts; we synthesize them over ChatExtra.
  const [peerSeenAt, setPeerSeenAt] = useState(0);

  // Онлайн-статус собеседника в шапке чата (обновляем каждые ~20с).
  useEffect(() => {
    if (!peer?.id) return;
    let alive = true;
    const check = () =>
      presence
        .status([peer.id])
        .then((r) => {
          const p = r.data?.[0];
          if (alive && p) setPeerPresence({ online: p.online, lastSeenAt: p.lastSeenAt });
        })
        .catch(() => {});
    check();
    const t = setInterval(check, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [peer?.id]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // First paint jumps to the bottom instantly; later updates only follow if you
  // were already there. Without this the 5s poll yanks you down mid-scroll.
  const firstPaintRef = useRef(true);
  // Last incoming message we've already acked with a seen marker, so viewing
  // doesn't POST a duplicate marker on every poll.
  const lastAckRef = useRef<string | null>(null);

  const rows = useMemo(
    () => buildThread([...messages, ...pending], user?.id),
    [messages, pending, user?.id],
  );

  // Show "Seen" under my last delivered message once the peer's read marker
  // reaches it. Suppressed while something of mine is still sending.
  const lastServer = messages[messages.length - 1];
  const showSeen =
    pending.length === 0 && !!lastServer && lastServer.userId === user?.id && peerSeenAt >= lastServer.at;

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

      // Read receipts: the peer's newest seen marker says how far they've read.
      setPeerSeenAt(latestPeerSeen(extra, user?.id));

      // Having viewed the thread, ack the newest incoming message once — this is
      // the marker the peer reads as our "Seen". It's a text message carrying the
      // sentinel (the store rewrites custom types to "text"), filtered out of the
      // thread and previews. Fire-and-forget.
      const newest = next[next.length - 1];
      if (user && newest && newest.userId !== user.id && lastAckRef.current !== newest.key) {
        lastAckRef.current = newest.key;
        chatExtra.send(chatId, user, "text", { text: SEEN_MARKER }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, [chatId, user]);

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
    setPeerSeenAt(0);
    setLoading(true);
    firstPaintRef.current = true;
    lastAckRef.current = null;
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

  // Unsend routes to whichever store the message actually lives in — the main
  // /Chat delete param is misspelled `massageId` (handled in services).
  const unsend = useCallback(
    async (m: UnifiedMessage) => {
      // Optimistically hide it so the bubble disappears at once.
      setMessages((prev) => prev.filter((x) => x.key !== m.key));
      try {
        if (m.store === "extra") await chatExtra.remove(m.id);
        else await chats.deleteMessage(m.id);
        await loadMessages();
        window.dispatchEvent(new Event(CHAT_SENT_EVENT));
      } catch {
        toast("Couldn't unsend the message");
        loadMessages(); // put it back if the delete didn't take
      }
    },
    [loadMessages],
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
            <div className="relative">
              <Avatar src={peer.image} name={peer.name} size={40} />
              {peerPresence?.online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-green-500" />
              )}
            </div>
            <div className="leading-tight">
              <span className="font-semibold">{peer.name}</span>
              <p className={`text-xs ${peerPresence?.online ? "text-green-500" : "text-neutral-500"}`}>
                {peerPresence?.online ? "online" : "offline"}
              </p>
            </div>
          </Link>
        )}
        <div className="ml-auto flex items-center gap-5 text-neutral-200">
          <button
            onClick={() => peer && startCall({ id: peer.id, name: peer.name }, "audio")}
            disabled={!peer || callBusy}
            aria-label="Audio call"
            className="disabled:opacity-40"
          >
            <PhoneIcon size={24} />
          </button>
          <button
            onClick={() => peer && startCall({ id: peer.id, name: peer.name }, "video")}
            disabled={!peer || callBusy}
            aria-label="Video call"
            className="disabled:opacity-40"
          >
            <VideoIcon size={24} />
          </button>
        </div>
      </header>

      {/* messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4">
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
              onUnsend={unsend}
            />
          );
        })}
        {showSeen && (
          <div className="mt-1 pr-1 text-right text-[11px] text-neutral-500">
            Seen {timeAgo(new Date(peerSeenAt).toISOString())}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <Composer onText={sendText} onGif={sendGif} onSticker={sendSticker} onVoice={sendVoice} />
    </div>
  );
}
