"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Img from "@/components/Img";
import MessageReactions from "@/components/MessageReactions";
import GifStickerPicker from "@/components/GifStickerPicker";
import { CallModal } from "@/components/CallModal";
import { chats } from "@/lib/services";
import { otherUser } from "@/components/ChatList";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { imageUrl } from "@/lib/config";
import type { ChatMessage } from "@/lib/types";
import { BackIcon, PhoneIcon, VideoIcon, ImageIcon, ShareIcon, SearchIcon, CloseIcon } from "@/components/Icons";

function MicGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}

const isMediaUrl = (t?: string) =>
  !!t && (/\.(gif|png|jpe?g|webp)(\?|$)/i.test(t) || /https?:\/\/\S*giphy\.com/i.test(t));
const isAudioFile = (f?: string) => !!f && /\.(mp3|wav|ogg|webm|m4a|aac)(\?|$)/i.test(f);

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const chatId = Number(params.id);
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<{ id: string; name: string; image: string | null } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [callType, setCallType] = useState<"video" | "audio" | null>(null);
  const [showGif, setShowGif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
    }
  }, [chatId]);

  useEffect(() => {
    chats
      .all()
      .then((res) => {
        const chat = (res.data ?? []).find((c) => c.chatId === chatId);
        if (chat) setPeer(otherUser(chat, user?.id));
      })
      .catch(() => {});
  }, [chatId, user?.id]);

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async (text: string, f?: File) => {
    if (!text.trim() && !f) return;
    try {
      await chats.send(chatId, text.trim(), f);
      await loadMessages();
    } catch {
      /* ignore */
    }
  };

  const send = handleSubmit(async ({ text }) => {
    await sendText(text, file ?? undefined);
    reset();
    setFile(null);
  });

  // Голосовое сообщение: запись через MediaRecorder → отправка файлом.
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const f = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        sendText("", f);
        setRecording(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      /* доступ к микрофону не дан */
    }
  };
  const stopRec = () => recRef.current?.stop();

  const shown = query.trim()
    ? messages.filter((m) => m.messageText?.toLowerCase().includes(query.trim().toLowerCase()))
    : messages;

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
          <button onClick={() => setShowSearch((s) => !s)} aria-label="Search messages" className="hover:text-white">
            <SearchIcon size={22} />
          </button>
          <button onClick={() => peer && setCallType("audio")} aria-label="Audio call" className="hover:text-white">
            <PhoneIcon size={24} />
          </button>
          <button onClick={() => peer && setCallType("video")} aria-label="Video call" className="hover:text-white">
            <VideoIcon size={24} />
          </button>
        </div>
      </header>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <SearchIcon size={16} className="text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in conversation…"
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-neutral-500">
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      )}

      {/* messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {shown.length === 0 && (
          <p className="my-auto text-center text-sm text-neutral-500">
            {query ? "No matching messages." : "No messages yet. Say hi 👋"}
          </p>
        )}
        {shown.map((m) => {
          const mine = m.userId === user?.id;
          const gif = isMediaUrl(m.messageText);
          return (
            <div key={m.messageId} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                  gif ? "bg-transparent p-0" : mine ? "bg-ig-blue text-white" : "bg-neutral-800 text-neutral-100"
                }`}
              >
                {m.file &&
                  (isAudioFile(m.file) ? (
                    <audio controls src={imageUrl(m.file)} className="w-56" />
                  ) : (
                    <Img src={m.file} alt="attachment" className="mb-1 max-h-64 rounded-lg object-cover" />
                  ))}
                {gif ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.messageText} alt="gif" className="max-h-64 rounded-lg" />
                ) : (
                  m.messageText && <p className="whitespace-pre-line break-words">{m.messageText}</p>
                )}
                {!gif && (
                  <span className="mt-0.5 block text-[10px] opacity-60">{timeAgo(m.sendMassageDate)}</span>
                )}
              </div>
              <MessageReactions messageId={m.messageId} mine={mine} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form onSubmit={send} className="relative flex items-center gap-2 border-t border-line px-4 py-3">
        <button type="button" onClick={() => fileRef.current?.click()} className="text-neutral-300 hover:text-white" aria-label="Attach image">
          <ImageIcon size={24} />
        </button>
        <button type="button" onClick={() => setShowGif((s) => !s)} className="text-xs font-bold text-neutral-300 hover:text-white" aria-label="GIF">
          GIF
        </button>
        <button
          type="button"
          onClick={recording ? stopRec : startRec}
          className={recording ? "animate-pulse text-ig-red" : "text-neutral-300 hover:text-white"}
          aria-label={recording ? "Stop recording" : "Record voice"}
          title={recording ? "Stop & send" : "Record voice message"}
        >
          <MicGlyph size={22} />
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

        {showGif && (
          <GifStickerPicker
            onPick={(text) => sendText(text)}
            onClose={() => setShowGif(false)}
          />
        )}
      </form>

      {callType && peer && user && (
        <CallModal me={user} peerId={peer.id} peerName={peer.name} type={callType} onClose={() => setCallType(null)} />
      )}
    </div>
  );
}
