"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import Skeleton from "@/components/Skeleton";
import { chats } from "@/lib/services";
import { otherUser } from "@/lib/chat";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { BackIcon, PhoneIcon, VideoIcon, ImageIcon, ShareIcon } from "@/components/Icons";

// Uneven widths so the loading thread reads as chat rather than a stack of bars.
const BUBBLE_WIDTHS = ["w-40", "w-28", "w-52", "w-36", "w-24", "w-44", "w-32"];

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [peer, setPeer] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<{ text: string }>({ defaultValues: { text: "" } });

  const loadMessages = useCallback(async () => {
    try {
      const res = await chats.byId(chatId);
      setMessages(res.data ?? []);
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

  // Initial + polling load.
  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = handleSubmit(async ({ text }) => {
    if (!text.trim() && !file) return;
    try {
      await chats.send(chatId, text.trim(), file ?? undefined);
      reset();
      setFile(null);
      await loadMessages();
    } catch {
      /* ignore */
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
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {loading &&
          BUBBLE_WIDTHS.map((w, i) => (
            <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
              <Skeleton className={`h-9 rounded-2xl ${w}`} />
            </div>
          ))}
        {!loading && messages.length === 0 && (
          <p className="my-auto text-center text-sm text-neutral-500">
            No messages yet. Say hi 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.userId === user?.id;
          return (
            <div key={m.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "bg-ig-blue text-white" : "bg-neutral-800 text-neutral-100"
                }`}
              >
                {m.file && (
                  <Img src={m.file} alt="attachment" className="mb-1 max-h-64 rounded-lg object-cover" />
                )}
                {m.messageText && <p className="whitespace-pre-line break-words">{m.messageText}</p>}
                <span className="mt-0.5 block text-[10px] opacity-60">
                  {timeAgo(m.sendMassageDate)}
                </span>
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
