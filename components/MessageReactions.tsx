"use client";

import { useEffect, useState } from "react";
import { messageReactions } from "@/lib/services";
import { useAuth } from "@/lib/auth";

const EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

/** Эмодзи-реакции на сообщение (данные — в доп-бэке /MessageReaction). */
export default function MessageReactions({ messageId, mine }: { messageId: number; mine: boolean }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ emoji: string; count: number }[]>([]);
  const [myEmoji, setMyEmoji] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    if (!user) return;
    messageReactions
      .get(messageId, user.id)
      .then((r) => { setSummary(r.data?.summary ?? []); setMyEmoji(r.data?.mine ?? null); })
      .catch(() => {});
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, user?.id]);

  const react = (emoji: string) => {
    if (!user) return;
    setOpen(false);
    if (myEmoji === emoji) messageReactions.remove(messageId, user.id).then(load).catch(() => {});
    else messageReactions.add(messageId, user.id, user.userName, emoji).then(load).catch(() => {});
  };

  return (
    <div className={`relative mt-0.5 flex items-center gap-1 ${mine ? "justify-end" : ""}`}>
      {summary.map((s) => (
        <button
          key={s.emoji}
          onClick={() => react(s.emoji)}
          className={`rounded-full border bg-black/40 px-1.5 text-[11px] ${myEmoji === s.emoji ? "border-ig-blue" : "border-line"}`}
        >
          {s.emoji} {s.count}
        </button>
      ))}
      <button onClick={() => setOpen((o) => !o)} className="px-0.5 text-xs text-neutral-500 hover:text-neutral-300" aria-label="React">
        ＋
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute bottom-6 z-20 flex gap-1 rounded-full border border-line bg-neutral-900 px-2 py-1 ${mine ? "right-0" : "left-0"}`}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => react(e)} className="text-lg transition hover:scale-125">{e}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
