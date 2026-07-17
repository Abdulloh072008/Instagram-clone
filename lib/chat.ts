import type { ChatListItem, ChatMessage } from "./types";
import { parseApiDate } from "./utils.ts";

/**
 * A chat row names both sides; which one is "the other person" depends on
 * whether I sent or received. Get this backwards and every chat shows your own
 * name, so it lives here with a test rather than inline in the list.
 */
export function otherUser(chat: ChatListItem, myId?: string) {
  const iAmSender = chat.sendUserId === myId;
  return {
    id: iAmSender ? chat.receiveUserId : chat.sendUserId,
    name: iAmSender ? chat.receiveUserName : chat.sendUserName,
    image: iAmSender ? chat.receiveUserImage : chat.sendUserImage,
  };
}

/**
 * The thread polls every few seconds and rebuilds its message array even when
 * nothing changed. Auto-scrolling on every rebuild yanks you to the bottom
 * mid-read. Only follow new messages when you were already parked near the
 * bottom — same rule Instagram uses. `threshold` is in px from the bottom.
 */
export function isNearBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }, threshold = 120) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/**
 * Two consecutive polls describe the same thread unless a message was added or
 * removed. Comparing the last id and the length is enough to tell "genuinely
 * new" from "same array, fresh reference", so the UI can skip re-render churn
 * and the auto-scroll decision.
 */
export function threadChanged(prev: ChatMessage[], next: ChatMessage[]) {
  if (prev.length !== next.length) return true;
  if (next.length === 0) return false;
  return prev[prev.length - 1]?.messageId !== next[next.length - 1]?.messageId;
}

/**
 * Local calendar day for a message ("2026-07-17"), used to decide where date
 * separators fall. Local, not UTC, because Instagram breaks the thread on the
 * viewer's midnight. Goes through parseApiDate so ChatExtra's missing-Z dates
 * don't land a day off.
 */
export function dayKey(dateStr?: string | null): string {
  const t = parseApiDate(dateStr);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// A run of messages from the same sender within this gap collapses into one
// visual group: one tail, one timestamp, one avatar. Instagram uses a few
// minutes; a new day always breaks the group regardless.
const GROUP_GAP_MS = 5 * 60 * 1000;

export type ThreadRow =
  | { kind: "date"; key: string; label: string }
  | {
      kind: "message";
      key: string;
      msg: ChatMessage;
      mine: boolean;
      /** first bubble of a visual group — gets top spacing */
      startsGroup: boolean;
      /** last bubble of a visual group — gets the tail, avatar and timestamp */
      endsGroup: boolean;
    };

function dateLabel(dateStr: string, now: number): string {
  const t = parseApiDate(dateStr);
  if (Number.isNaN(t)) return "";
  if (dayKey(new Date(now).toISOString()) === dayKey(dateStr)) return "Today";
  if (dayKey(new Date(now - 86400000).toISOString()) === dayKey(dateStr)) return "Yesterday";
  return new Date(t).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/**
 * Flat message list -> display rows with date separators and per-bubble
 * grouping flags. Pure so the whole grouping decision is covered by tests;
 * the page just maps rows to JSX. `now` is injected so "Today"/"Yesterday"
 * are testable.
 */
export function buildThread(messages: ChatMessage[], myId: string | undefined, now: number = Date.now()): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const newDay = !prev || dayKey(prev.sendMassageDate) !== dayKey(msg.sendMassageDate);
    if (newDay) {
      rows.push({ kind: "date", key: `date-${msg.messageId}`, label: dateLabel(msg.sendMassageDate, now) });
    }

    const gapBefore = prev ? parseApiDate(msg.sendMassageDate) - parseApiDate(prev.sendMassageDate) : Infinity;
    const gapAfter = next ? parseApiDate(next.sendMassageDate) - parseApiDate(msg.sendMassageDate) : Infinity;
    const sameSenderBefore = prev?.userId === msg.userId;
    const sameSenderAfter = next?.userId === msg.userId;
    const sameDayAfter = next && dayKey(next.sendMassageDate) === dayKey(msg.sendMassageDate);

    rows.push({
      kind: "message",
      key: String(msg.messageId),
      msg,
      mine: msg.userId === myId,
      startsGroup: newDay || !sameSenderBefore || gapBefore > GROUP_GAP_MS,
      endsGroup: !next || !sameSenderAfter || !sameDayAfter || gapAfter > GROUP_GAP_MS,
    });
  }
  return rows;
}
