import type {
  ChatListItem,
  ChatMessage,
  ExtraMessage,
  MessageKind,
  MessageReactions,
  UnifiedMessage,
} from "./types";
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

// ---------- Two stores, one thread ----------

const KNOWN_KINDS: MessageKind[] = ["text", "image", "gif", "voice", "sticker"];

// The ChatExtra store only accepts the kinds above — it rewrites any other
// `type` to "text". So a read receipt can't be its own type; it's a normal text
// message whose body is this improbable sentinel token, which we recognize and
// keep out of the thread and previews. Plain ASCII so the server preserves it
// byte-for-byte; no user types this as a whole message.
export const SEEN_MARKER = "__ig_seen_marker__";

/** Is this message one of our read-receipt markers rather than real text? */
export function isSeenMarker(text: string | null | undefined): boolean {
  return text === SEEN_MARKER;
}

/**
 * The peer's most recent read time (epoch-ms, 0 if never), from their seen
 * markers in the raw ChatExtra list. Markers I wrote are excluded — only the
 * other side's reads count as "they saw it".
 */
export function latestPeerSeen(extra: ExtraMessage[], myId: string | undefined): number {
  const times = extra
    .filter((e) => isSeenMarker(e.text) && e.senderId !== myId)
    .map((e) => parseApiDate(e.createdAt))
    .filter((t) => !Number.isNaN(t));
  return times.length ? Math.max(...times) : 0;
}

// ChatExtra ids start at 1 and share no space with main /Chat ids, so a bare
// messageId would let a reaction on extra #5 land on main #5. Offsetting the
// extra store into a disjoint range makes the collision impossible. See
// reactionKey; the assumption (main ids never reach a billion) is pinned by a test.
export const EXTRA_ID_OFFSET = 1_000_000_000;

/** Stable, collision-proof key to react to a message across both stores. */
export function reactionKey(msg: { store: "main" | "extra"; id: number }): number {
  return msg.store === "extra" ? msg.id + EXTRA_ID_OFFSET : msg.id;
}

const EMPTY_REACTIONS: MessageReactions = { total: 0, summary: [], mine: null, reactions: [] };

/**
 * Optimistically apply my reaction before the server confirms it: picking the
 * emoji I already have removes it (Instagram toggles), any other emoji replaces
 * mine. Recomputes the summary tallies so the pill updates instantly. Pure, so
 * the toggle rules are covered by tests; the server value overwrites this on the
 * next fetch.
 */
export function toggleReaction(
  prev: MessageReactions | null,
  emoji: string,
  me: { id: string; userName: string },
): MessageReactions {
  const base = prev ?? EMPTY_REACTIONS;
  const removing = base.mine === emoji;
  let reactions = base.reactions.filter((r) => r.userId !== me.id);
  if (!removing) {
    reactions = [
      ...reactions,
      { id: -1, messageId: 0, userId: me.id, userName: me.userName, emoji, createdAt: new Date().toISOString() },
    ];
  }
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  return {
    total: reactions.length,
    summary: [...counts.entries()].map(([e, count]) => ({ emoji: e, count })),
    mine: removing ? null : emoji,
    reactions,
  };
}

function coerceKind(type: string | null | undefined): MessageKind {
  return (KNOWN_KINDS as string[]).includes(type ?? "") ? (type as MessageKind) : "text";
}

/** Normalize a main /Chat message into the unified shape. */
export function fromMain(m: ChatMessage): UnifiedMessage {
  return {
    key: `m${m.messageId}`,
    store: "main",
    id: m.messageId,
    userId: m.userId,
    userName: m.userName,
    userImage: m.userImage,
    text: m.messageText ?? "",
    file: m.file ?? null,
    kind: m.file ? "image" : "text",
    at: parseApiDate(m.sendMassageDate),
    date: m.sendMassageDate,
    durationSec: null,
  };
}

/** Normalize a ChatExtra message into the unified shape. */
export function fromExtra(e: ExtraMessage): UnifiedMessage {
  return {
    key: `x${e.id}`,
    store: "extra",
    id: e.id,
    userId: e.senderId,
    userName: e.senderName,
    userImage: null, // ChatExtra doesn't store a sender image
    text: e.text ?? "",
    file: e.mediaUrl ?? null,
    kind: coerceKind(e.type),
    at: parseApiDate(e.createdAt),
    date: e.createdAt,
    durationSec: e.durationSec ?? null,
  };
}

/**
 * Merge the two message stores into one time-ordered thread. Marker messages
 * (read receipts) are dropped here so they never render as bubbles. Safe to
 * sort by `at` across stores: the two servers' clocks agree to within seconds
 * (measured), and both dates go through parseApiDate so ChatExtra's missing-Z
 * timestamps don't drift a whole timezone.
 */
export function mergeThread(main: ChatMessage[], extra: ExtraMessage[]): UnifiedMessage[] {
  const merged = [...main.map(fromMain), ...extra.map(fromExtra)].filter((m) => !isSeenMarker(m.text));
  return merged.sort((a, b) => a.at - b.at);
}

/**
 * The thread polls every few seconds and rebuilds its array even when nothing
 * changed. Comparing length and the last message's key tells "genuinely new"
 * from "same thread, fresh reference", so the UI can skip re-render churn and
 * the auto-scroll decision.
 */
export function threadChanged(prev: UnifiedMessage[], next: UnifiedMessage[]) {
  if (prev.length !== next.length) return true;
  if (next.length === 0) return false;
  return prev[prev.length - 1]?.key !== next[next.length - 1]?.key;
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
      msg: UnifiedMessage;
      mine: boolean;
      /** first bubble of a visual group — gets top spacing */
      startsGroup: boolean;
      /** last bubble of a visual group — gets the tail, avatar and timestamp */
      endsGroup: boolean;
    };

// The one-line inbox summary for each kind. Text falls through to the message body.
const KIND_LABEL: Partial<Record<MessageKind, string>> = {
  image: "📷 Photo",
  gif: "GIF",
  voice: "🎤 Voice message",
  sticker: "Sticker",
};

/**
 * One-line inbox preview for a chat's most recent message, mirroring
 * Instagram: your own messages read "You: …", media collapses to a label.
 * Null (a chat with no messages yet) reads as an invitation, not a blank.
 */
export function previewText(msg: UnifiedMessage | null | undefined, myId?: string): string {
  if (!msg) return "No messages yet";
  const body = msg.text.trim() || KIND_LABEL[msg.kind] || (msg.file ? "📷 Photo" : "");
  if (!body) return "No messages yet";
  return msg.userId === myId ? `You: ${body}` : body;
}

/**
 * Sort chats newest-activity-first for the inbox. `activityAt` maps chatId to
 * the epoch-ms of its last message; chats we couldn't load (or that are empty)
 * fall to the bottom. Returns a copy — never mutates the caller's array.
 */
export function sortByActivity<T extends { chatId: number }>(
  chats: T[],
  activityAt: Record<number, number>,
): T[] {
  return [...chats].sort((a, b) => (activityAt[b.chatId] ?? 0) - (activityAt[a.chatId] ?? 0));
}

function dateLabel(dateStr: string, now: number): string {
  const t = parseApiDate(dateStr);
  if (Number.isNaN(t)) return "";
  if (dayKey(new Date(now).toISOString()) === dayKey(dateStr)) return "Today";
  if (dayKey(new Date(now - 86400000).toISOString()) === dayKey(dateStr)) return "Yesterday";
  return new Date(t).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/**
 * Flat unified message list -> display rows with date separators and per-bubble
 * grouping flags. Pure so the whole grouping decision is covered by tests; the
 * page just maps rows to JSX. `now` is injected so "Today"/"Yesterday" are
 * testable. Assumes `messages` is already time-ordered (mergeThread guarantees it).
 */
export function buildThread(messages: UnifiedMessage[], myId: string | undefined, now: number = Date.now()): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const newDay = !prev || dayKey(prev.date) !== dayKey(msg.date);
    if (newDay) {
      rows.push({ kind: "date", key: `date-${msg.key}`, label: dateLabel(msg.date, now) });
    }

    const gapBefore = prev ? msg.at - prev.at : Infinity;
    const gapAfter = next ? next.at - msg.at : Infinity;
    const sameSenderBefore = prev?.userId === msg.userId;
    const sameSenderAfter = next?.userId === msg.userId;
    const sameDayAfter = next && dayKey(next.date) === dayKey(msg.date);

    rows.push({
      kind: "message",
      key: msg.key,
      msg,
      mine: msg.userId === myId,
      startsGroup: newDay || !sameSenderBefore || gapBefore > GROUP_GAP_MS,
      endsGroup: !next || !sameSenderAfter || !sameDayAfter || gapAfter > GROUP_GAP_MS,
    });
  }
  return rows;
}
