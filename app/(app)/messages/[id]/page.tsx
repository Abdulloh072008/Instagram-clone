"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import { insta2, getInsta2Uid, REACTIONS, type I2Message, type I2User, type Emoji } from "@/lib/insta2";
import { timeAgo } from "@/lib/utils";
import { BackIcon, PhoneIcon, VideoIcon, ShareIcon, MoreIcon } from "@/components/Icons";

function reactionEntries(m: I2Message): [string, number][] {
  return Object.entries(m.reactions ?? {}).filter(([, n]) => n > 0);
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const peerId = Number(params.id);
  const myId = getInsta2Uid();

  const [peer, setPeer] = useState<I2User | null>(null);
  const [messages, setMessages] = useState<I2Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null); // message id with open action menu
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await insta2.chat.with(peerId);
      setPeer(r.user);
      setMessages(r.messages ?? []);
    } catch {
      /* new-backend session may be missing */
    }
  }, [peerId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3500);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await insta2.chat.send(peerId, body);
      setText("");
      await load();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  async function react(id: number, emoji: Emoji) {
    setMenuFor(null);
    try {
      await insta2.chat.reactMessage(id, emoji);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function remove(id: number) {
    setMenuFor(null);
    try {
      await insta2.chat.deleteMessage(id);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const body = editing.text.trim();
    if (!body) return;
    try {
      await insta2.chat.editMessage(editing.id, body);
      setEditing(null);
      await load();
    } catch {
      /* ignore */
    }
  }

  const status = peer?.isOnline
    ? "Active now"
    : peer?.lastSeenAt
      ? `Active ${timeAgo(peer.lastSeenAt)} ago`
      : "";

  const lastMineSeen = [...messages].reverse().find((m) => m.senderId === myId && m.seenAt);

  return (
    <div className="flex h-screen flex-col">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/messages" className="md:hidden">
          <BackIcon size={24} />
        </Link>
        {peer && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar src={peer.avatarUrl} name={peer.fullName || peer.username} size={40} />
              {peer.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-green-500" />
              )}
            </div>
            <div className="leading-tight">
              <p className="font-semibold">{peer.fullName || peer.username}</p>
              {status && (
                <p className={`text-xs ${peer.isOnline ? "text-green-500" : "text-neutral-500"}`}>
                  {status}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-5 text-neutral-200">
          <PhoneIcon size={24} />
          <VideoIcon size={24} />
        </div>
      </header>

      {/* messages */}
      <div
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4"
        onClick={() => setMenuFor(null)}
      >
        {messages.length === 0 && (
          <p className="my-auto text-center text-sm text-neutral-500">No messages yet. Say hi 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === myId;
          const reactions = reactionEntries(m);
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className="group relative flex items-center gap-1">
                {mine && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === m.id ? null : m.id);
                    }}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <MoreIcon size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!m.deleted) setMenuFor(menuFor === m.id ? null : m.id);
                  }}
                  className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-left text-sm ${
                    m.deleted
                      ? "bg-neutral-900 italic text-neutral-500"
                      : mine
                        ? "bg-ig-blue text-white"
                        : "bg-neutral-800 text-neutral-100"
                  }`}
                >
                  {m.deleted ? (
                    "This message was deleted"
                  ) : m.voiceUrl ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio src={m.voiceUrl} controls className="h-8" />
                  ) : (
                    <span className="whitespace-pre-line break-words">{m.text}</span>
                  )}
                  {m.edited && !m.deleted && (
                    <span className="ml-1.5 text-[10px] opacity-60">edited</span>
                  )}
                </button>
                {!mine && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === m.id ? null : m.id);
                    }}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <MoreIcon size={16} />
                  </button>
                )}

                {/* action popover */}
                {menuFor === m.id && !m.deleted && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute bottom-full z-20 mb-1 flex flex-col overflow-hidden rounded-xl border border-line bg-elevated shadow-xl ${
                      mine ? "right-0" : "left-0"
                    }`}
                  >
                    <div className="flex gap-1 border-b border-line px-2 py-1.5">
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => react(m.id, emoji)}
                          className="rounded-full p-1 text-lg transition hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {mine && (
                      <>
                        <button
                          onClick={() => {
                            setEditing({ id: m.id, text: m.text ?? "" });
                            setMenuFor(null);
                          }}
                          className="px-4 py-2 text-left text-sm hover:bg-neutral-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(m.id)}
                          className="px-4 py-2 text-left text-sm text-ig-red hover:bg-neutral-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* reactions row */}
              {reactions.length > 0 && (
                <div className={`-mt-1 flex gap-1 ${mine ? "pr-2" : "pl-2"}`}>
                  {reactions.map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="rounded-full border border-line bg-elevated px-1.5 text-xs"
                    >
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}

              <span className="px-1 text-[10px] text-neutral-600">{timeAgo(m.createdAt)}</span>
            </div>
          );
        })}
        {lastMineSeen && <p className="pr-1 text-right text-[10px] text-neutral-500">Seen</p>}
        <div ref={bottomRef} />
      </div>

      {/* composer / edit bar */}
      {editing ? (
        <form onSubmit={saveEdit} className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="text-xs text-neutral-500">Editing</span>
          <input
            autoFocus
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            className="flex-1 rounded-full border border-line bg-transparent px-4 py-2 text-sm outline-none"
          />
          <button type="button" onClick={() => setEditing(null)} className="text-sm text-neutral-400">
            Cancel
          </button>
          <button type="submit" className="text-sm font-semibold text-ig-blue">
            Save
          </button>
        </form>
      ) : (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-line px-4 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line px-4 py-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="text-ig-blue disabled:opacity-40"
          >
            <ShareIcon size={24} />
          </button>
        </form>
      )}
    </div>
  );
}
