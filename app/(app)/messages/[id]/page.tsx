"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import Skeleton from "@/components/Skeleton";
import { toast } from "@/lib/toast";
import { chats } from "@/lib/services";
import { otherUser, isNearBottom, threadChanged, buildThread } from "@/lib/chat";
import { CHAT_SENT_EVENT } from "@/components/ChatList";
import { useAuth } from "@/lib/auth";
import { parseApiDate } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { BackIcon, PhoneIcon, VideoIcon, ImageIcon, ShareIcon } from "@/components/Icons";

// Uneven widths so the loading thread reads as chat rather than a stack of bars.
const BUBBLE_WIDTHS = ["w-40", "w-28", "w-52", "w-36", "w-24", "w-44", "w-32"];

// Full localized timestamp for the hover tooltip. Through parseApiDate so
// ChatExtra's missing-Z dates don't read five hours off.
function fullTime(dateStr?: string | null): string {
  const t = parseApiDate(dateStr);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString();
}

// Instagram tucks the corners where bubbles touch within a group and keeps the
// one rounded "tail" corner on the last bubble, on the side the sender is on.
function bubbleCorners(mine: boolean, startsGroup: boolean, endsGroup: boolean): string {
  const tail = mine ? "rounded-br-md" : "rounded-bl-md";
  return [
    "rounded-2xl",
    !startsGroup && (mine ? "rounded-tr-md" : "rounded-tl-md"),
    !endsGroup && tail,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [peer, setPeer] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // Optimistic messages shown before the server confirms them. Negative
  // messageId marks them as still sending and keeps them from colliding with
  // real ids. Kept apart from `messages` so the 5s poll can't wipe them.
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // First paint jumps to the bottom instantly; later updates only follow if you
  // were already there. Without this the 5s poll yanks you down mid-scroll.
  const firstPaintRef = useRef(true);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<{ text: string }>({ defaultValues: { text: "" } });

  const rows = useMemo(
    () => buildThread([...messages, ...pending], user?.id),
    [messages, pending, user?.id],
  );

  const loadMessages = useCallback(async () => {
    try {
      const res = await chats.byId(chatId);
      const next = res.data ?? [];
      // Keep the old array reference when nothing changed, so effects keyed on
      // `messages` don't re-run every poll (scroll, and later the reaction observer).
      setMessages((prev) => (threadChanged(prev, next) ? next : prev));
    } catch {
      /* ignore */
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

  const send = handleSubmit(async ({ text }) => {
    const body = text.trim();
    if (!body && !file) return;
    const sentFile = file;
    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      chatId,
      messageId: tempId,
      userId: user?.id ?? "",
      userName: user?.userName ?? "",
      userImage: user?.image ?? null,
      messageText: body,
      sendMassageDate: new Date().toISOString(),
      file: sentFile ? URL.createObjectURL(sentFile) : null,
    };
    // Show it immediately, clear the composer.
    setPending((p) => [...p, optimistic]);
    reset();
    setFile(null);
    try {
      await chats.send(chatId, body, sentFile ?? undefined);
      await loadMessages();
      window.dispatchEvent(new Event(CHAT_SENT_EVENT)); // nudge the inbox to re-sort
    } catch {
      toast("Couldn't send your message");
      reset({ text: body }); // put their words back so nothing is lost
      setFile(sentFile);
    } finally {
      setPending((p) => p.filter((m) => m.messageId !== tempId));
    }
  });

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
          const { msg: m, mine, startsGroup, endsGroup } = row;
          return (
            <div
              key={row.key}
              className={`group flex items-end gap-2 ${startsGroup ? "mt-3" : "mt-0.5"} ${
                mine ? "justify-end" : "justify-start"
              }`}
            >
              {/* avatar gutter (incoming only), filled on the last bubble of a group */}
              {!mine && (
                <div className="w-7 shrink-0">
                  {endsGroup && <Avatar src={m.userImage} name={m.userName} size={28} />}
                </div>
              )}
              <div
                title={fullTime(m.sendMassageDate)}
                className={`max-w-[70%] px-3.5 py-2 text-sm ${
                  mine ? "bg-ig-blue text-white" : "bg-neutral-800 text-neutral-100"
                } ${bubbleCorners(mine, startsGroup, endsGroup)} ${
                  m.messageId < 0 ? "opacity-60" : ""
                }`}
              >
                {m.file && (
                  <Img src={m.file} alt="attachment" className="mb-1 max-h-64 rounded-lg object-cover" />
                )}
                {m.messageText && <p className="whitespace-pre-line wrap-break-word">{m.messageText}</p>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-line px-4 py-3">
        <button type="button" onClick={() => fileRef.current?.click()} className="text-neutral-300">
          <ImageIcon size={24} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-1 items-center gap-2 rounded-full border border-line px-4 py-2">
          <input
            {...register("text")}
            placeholder={file ? `📎 ${file.name}` : "Message…"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || (!watch("text")?.trim() && !file)}
          className="text-ig-blue disabled:opacity-40"
        >
          <ShareIcon size={24} />
        </button>
      </form>
    </div>
  );
}
