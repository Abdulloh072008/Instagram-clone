"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Img from "./Img";
import VoiceMessage from "./VoiceMessage";
import { SmileIcon } from "./Icons";
import { parseApiDate } from "@/lib/utils";
import { reactionKey, toggleReaction } from "@/lib/chat";
import { messageReactions } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { MessageReactions, UnifiedMessage } from "@/lib/types";

// The quick-reaction row, same set Instagram offers on long-press.
const QUICK = ["❤️", "😂", "😮", "😢", "😡", "👍"];

// Full localized timestamp for the hover tooltip. Through parseApiDate so
// ChatExtra's missing-Z dates don't read hours off.
function fullTime(dateStr?: string | null): string {
  const t = parseApiDate(dateStr);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleString();
}

// Instagram tucks the corners where bubbles touch within a group and keeps the
// one rounded "tail" corner on the last bubble, on the side the sender is on.
function bubbleCorners(mine: boolean, startsGroup: boolean, endsGroup: boolean): string {
  const tail = mine ? "rounded-br-md" : "rounded-bl-md";
  return ["rounded-2xl", !startsGroup && (mine ? "rounded-tr-md" : "rounded-tl-md"), !endsGroup && tail]
    .filter(Boolean)
    .join(" ");
}

export default function MessageBubble({
  m,
  mine,
  startsGroup,
  endsGroup,
  peerImage,
}: {
  m: UnifiedMessage;
  mine: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  peerImage?: string | null;
}) {
  const { user } = useAuth();
  const sending = m.sending || m.id < 0;
  // Stickers float free — no bubble, no background.
  const bare = m.kind === "sticker";

  const [reactions, setReactions] = useState<MessageReactions | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Fetch this message's reactions only once it scrolls into view, then cache —
  // there's no bulk endpoint, so eagerly fetching a long thread would be one
  // request per message. Optimistic messages have nothing server-side to load.
  useEffect(() => {
    if (sending) return;
    const el = wrapRef.current;
    if (!el || fetchedRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !fetchedRef.current) {
          fetchedRef.current = true;
          io.disconnect();
          messageReactions
            .get(reactionKey(m), user?.id)
            .then((r) => setReactions(r.data ?? null))
            .catch(() => {});
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sending, m, user?.id]);

  async function react(emoji: string) {
    if (!user || sending) return;
    setPickerOpen(false);
    const key = reactionKey(m);
    const wasMine = reactions?.mine ?? null;
    // Optimistic toggle, then trust the server's tally.
    setReactions((prev) => toggleReaction(prev, emoji, { id: user.id, userName: user.userName }));
    try {
      if (wasMine === emoji) await messageReactions.remove(key, user.id);
      else await messageReactions.add(key, user, emoji);
      const fresh = await messageReactions.get(key, user.id);
      setReactions(fresh.data ?? null);
    } catch {
      messageReactions.get(key, user.id).then((r) => setReactions(r.data ?? null)).catch(() => {});
    }
  }

  let content;
  if (m.kind === "sticker" && m.file) {
    // Stickers are emoji glyphs in this backend, not images — render big text.
    content = <span className="text-6xl leading-none">{m.file}</span>;
  } else if (m.kind === "voice" && m.file) {
    content = <VoiceMessage src={m.file} durationSec={m.durationSec} seed={m.id} mine={mine} />;
  } else {
    content = (
      <>
        {m.file && (m.kind === "image" || m.kind === "gif") && (
          <Img
            src={m.file}
            alt={m.kind}
            className={`max-h-72 rounded-lg object-cover ${m.text ? "mb-1" : ""}`}
          />
        )}
        {m.text && <p className="whitespace-pre-line wrap-break-word">{m.text}</p>}
      </>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`group flex items-end gap-2 ${startsGroup ? "mt-3" : "mt-0.5"} ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      {/* avatar gutter (incoming only), filled on the last bubble of a group */}
      {!mine && (
        <div className="w-7 shrink-0">
          {endsGroup && <Avatar src={m.userImage ?? peerImage} name={m.userName} size={28} />}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
          <div
            onDoubleClick={() => react("❤️")}
            title={fullTime(m.date)}
            className={
              bare
                ? `${sending ? "opacity-60" : ""}`
                : `px-3.5 py-2 text-sm ${
                    mine ? "bg-ig-blue text-white" : "bg-neutral-800 text-neutral-100"
                  } ${bubbleCorners(mine, startsGroup, endsGroup)} ${sending ? "opacity-60" : ""}`
            }
          >
            {content}
          </div>

          {/* react affordance — appears on hover, opens the quick-emoji row */}
          {!sending && (
            <div className="relative opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                aria-label="React"
                className="text-neutral-400 hover:text-neutral-200"
              >
                <SmileIcon size={18} />
              </button>
              {pickerOpen && (
                <div className="absolute bottom-full z-10 mb-1 flex gap-1 rounded-full bg-neutral-800 px-2 py-1 shadow-lg ring-1 ring-black/40">
                  {QUICK.map((e) => (
                    <button key={e} onClick={() => react(e)} className="text-lg transition hover:scale-125">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* reaction pill, overlapping the bubble's bottom edge like Instagram */}
        {reactions && reactions.total > 0 && (
          <div
            className={`-mt-1.5 rounded-full bg-neutral-800 px-1.5 py-0.5 text-xs ring-2 ring-black/60 ${
              mine ? "mr-1" : "ml-1"
            }`}
          >
            {reactions.summary.map((s) => s.emoji).join("")}
            {reactions.total > 1 ? ` ${reactions.total}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
