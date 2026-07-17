import { test } from "node:test";
import assert from "node:assert/strict";
import {
  otherUser,
  isNearBottom,
  threadChanged,
  buildThread,
  dayKey,
  previewText,
  sortByActivity,
  mergeThread,
  reactionKey,
  toggleReaction,
  fromExtra,
  latestPeerSeen,
  mediaUrlFromText,
  SEEN_MARKER,
  EXTRA_ID_OFFSET,
} from "./chat.ts";
import type { ThreadRow } from "./chat.ts";
import type { ChatListItem, ChatMessage, ExtraMessage, MessageReactions, UnifiedMessage } from "./types.ts";

const chat: ChatListItem = {
  chatId: 1,
  sendUserId: "me",
  sendUserName: "ann",
  sendUserImage: "ann.jpg",
  receiveUserId: "you",
  receiveUserName: "bob",
  receiveUserImage: "bob.jpg",
};

test("otherUser returns the receiver when I sent the chat", () => {
  assert.deepEqual(otherUser(chat, "me"), { id: "you", name: "bob", image: "bob.jpg" });
});

test("otherUser returns the sender when I received the chat", () => {
  assert.deepEqual(otherUser(chat, "you"), { id: "me", name: "ann", image: "ann.jpg" });
});

// Auth resolves a tick after the chat list paints, so myId is briefly undefined.
test("otherUser shows the sender while my id is still unknown", () => {
  assert.deepEqual(otherUser(chat), { id: "me", name: "ann", image: "ann.jpg" });
});

test("otherUser carries a missing avatar through as null", () => {
  assert.equal(otherUser({ ...chat, receiveUserImage: null }, "me").image, null);
});

test("isNearBottom: parked at the bottom follows new messages", () => {
  assert.equal(isNearBottom({ scrollHeight: 1000, scrollTop: 880, clientHeight: 120 }), true);
});

test("isNearBottom: scrolled up to read history does not get yanked", () => {
  assert.equal(isNearBottom({ scrollHeight: 1000, scrollTop: 100, clientHeight: 120 }), false);
});

// Fixture dates carry no zone (like the real APIs); AT mirrors parseApiDate's "append Z".
const AT = (d: string) => Date.parse(`${d}Z`);
function mk(id: number, userId: string, date: string, extra: Partial<UnifiedMessage> = {}): UnifiedMessage {
  return {
    key: `m${id}`,
    store: "main",
    id,
    userId,
    userName: userId,
    userImage: null,
    text: "x",
    file: null,
    kind: "text",
    at: AT(date),
    date,
    durationSec: null,
    ...extra,
  };
}

test("threadChanged: a new message at the end counts as changed", () => {
  assert.equal(threadChanged([mk(1, "me", "2026-07-17T10:00:00")], [mk(1, "me", "2026-07-17T10:00:00"), mk(2, "me", "2026-07-17T10:01:00")]), true);
});

test("threadChanged: the same thread re-fetched is not a change", () => {
  const a = [mk(1, "me", "2026-07-17T10:00:00"), mk(2, "me", "2026-07-17T10:01:00")];
  const b = [mk(1, "me", "2026-07-17T10:00:00"), mk(2, "me", "2026-07-17T10:01:00")];
  assert.equal(threadChanged(a, b), false);
});

test("threadChanged: two empty polls are not a change", () => {
  assert.equal(threadChanged([], []), false);
});

const onlyMessages = (rows: ThreadRow[]) => rows.filter((r) => r.kind === "message") as Extract<ThreadRow, { kind: "message" }>[];

test("buildThread: consecutive messages from the same sender group together", () => {
  const rows = onlyMessages(
    buildThread(
      [mk(1, "me", "2026-07-17T10:00:00"), mk(2, "me", "2026-07-17T10:01:00")],
      "me",
      Date.parse("2026-07-17T10:05:00Z"),
    ),
  );
  assert.equal(rows[0].startsGroup, true);
  assert.equal(rows[0].endsGroup, false);
  assert.equal(rows[1].startsGroup, false);
  assert.equal(rows[1].endsGroup, true);
});

test("buildThread: a different sender breaks the group", () => {
  const rows = onlyMessages(
    buildThread(
      [mk(1, "me", "2026-07-17T10:00:00"), mk(2, "you", "2026-07-17T10:01:00")],
      "me",
      Date.parse("2026-07-17T10:05:00Z"),
    ),
  );
  assert.equal(rows[0].endsGroup, true);
  assert.equal(rows[1].startsGroup, true);
  assert.equal(rows[0].mine, true);
  assert.equal(rows[1].mine, false);
});

test("buildThread: a gap over five minutes breaks a same-sender group", () => {
  const rows = onlyMessages(
    buildThread(
      [mk(1, "me", "2026-07-17T10:00:00"), mk(2, "me", "2026-07-17T10:30:00")],
      "me",
      Date.parse("2026-07-17T11:00:00Z"),
    ),
  );
  assert.equal(rows[0].endsGroup, true);
  assert.equal(rows[1].startsGroup, true);
});

test("buildThread: a new day inserts one date separator before the message", () => {
  const rows = buildThread(
    [mk(1, "me", "2026-07-16T10:00:00"), mk(2, "me", "2026-07-17T10:00:00")],
    "me",
    Date.parse("2026-07-17T12:00:00Z"),
  );
  const dates = rows.filter((r) => r.kind === "date");
  assert.equal(dates.length, 2);
  // crossing midnight always breaks the group even within the gap window
  const msgs = onlyMessages(rows);
  assert.equal(msgs[0].endsGroup, true);
  assert.equal(msgs[1].startsGroup, true);
});

test("buildThread: an empty thread yields no rows", () => {
  assert.deepEqual(buildThread([], "me"), []);
});

// Near UTC noon so the pair stays inside one local day for any real timezone.
test("dayKey: two times an hour apart mid-day share a day", () => {
  assert.equal(dayKey("2026-07-17T12:00:00"), dayKey("2026-07-17T13:00:00"));
});

test("previewText: my own message is prefixed with You:", () => {
  assert.equal(previewText(mk(1, "me", "2026-07-17T10:00:00"), "me"), "You: x");
});

test("previewText: a message from the other side has no prefix", () => {
  assert.equal(previewText(mk(1, "you", "2026-07-17T10:00:00"), "me"), "x");
});

test("previewText: a photo with no text collapses to a label", () => {
  const photo = mk(1, "you", "2026-07-17T10:00:00", { text: "", kind: "image", file: "/x.jpg" });
  assert.equal(previewText(photo, "me"), "📷 Photo");
});

test("previewText: a GIF previews by kind, not as a raw URL", () => {
  const gif = mk(1, "me", "2026-07-17T10:00:00", { text: "", kind: "gif", file: "https://x/g.gif" });
  assert.equal(previewText(gif, "me"), "You: GIF");
});

test("previewText: an empty chat reads as an invitation", () => {
  assert.equal(previewText(null, "me"), "No messages yet");
});

test("sortByActivity: newest activity first, unknown chats last", () => {
  const chats = [{ chatId: 1 }, { chatId: 2 }, { chatId: 3 }];
  const order = sortByActivity(chats, { 1: 100, 2: 300 }).map((c) => c.chatId);
  assert.deepEqual(order, [2, 1, 3]);
});

test("sortByActivity: does not mutate the input array", () => {
  const chats = [{ chatId: 1 }, { chatId: 2 }];
  sortByActivity(chats, { 2: 999 });
  assert.deepEqual(chats.map((c) => c.chatId), [1, 2]);
});

// ---------- merge + reaction keys ----------

const mainMsg: ChatMessage = {
  chatId: 1,
  messageId: 5,
  userId: "me",
  userName: "me",
  userImage: null,
  messageText: "hello",
  sendMassageDate: "2026-07-17T10:00:00",
  file: null,
};
const extraGif: ExtraMessage = {
  id: 1,
  chatId: 1,
  senderId: "you",
  senderName: "bob",
  type: "gif",
  text: null,
  mediaUrl: "/g.gif",
  fileName: null,
  durationSec: null,
  createdAt: "2026-07-17T10:01:00",
};

test("mergeThread: interleaves both stores in time order", () => {
  const merged = mergeThread([mainMsg], [extraGif]);
  assert.deepEqual(merged.map((m) => m.key), ["m5", "x1"]);
  assert.equal(merged[1].kind, "gif");
});

test("mergeThread: read-receipt markers never become bubbles", () => {
  // The store rewrites custom types to "text", so a marker arrives as a text
  // message carrying the sentinel — it must be filtered by body, not type.
  const seen: ExtraMessage = { ...extraGif, id: 2, type: "text", text: SEEN_MARKER, mediaUrl: null, createdAt: "2026-07-17T10:05:00" };
  const merged = mergeThread([mainMsg], [extraGif, seen]);
  assert.equal(merged.length, 2);
  assert.ok(!merged.some((m) => m.text === SEEN_MARKER));
});

test("latestPeerSeen: takes the peer's newest marker, ignores my own", () => {
  const mkr = (id: number, senderId: string, at: string): ExtraMessage => ({
    ...extraGif,
    id,
    senderId,
    type: "text",
    text: SEEN_MARKER,
    mediaUrl: null,
    createdAt: at,
  });
  const extra = [
    mkr(1, "you", "2026-07-17T10:00:00"),
    mkr(2, "you", "2026-07-17T10:05:00"),
    mkr(3, "me", "2026-07-17T10:09:00"), // mine — must not count
  ];
  assert.equal(latestPeerSeen(extra, "me"), Date.parse("2026-07-17T10:05:00Z"));
});

test("latestPeerSeen: no markers means never seen (0)", () => {
  assert.equal(latestPeerSeen([extraGif], "me"), 0);
});

test("mediaUrlFromText: a lone Giphy URL is recognized as an image", () => {
  const url = "https://media4.giphy.com/media/v1.abcDEF/200.gif";
  assert.equal(mediaUrlFromText(url), url);
});

test("mediaUrlFromText: a plain image URL is recognized", () => {
  assert.equal(mediaUrlFromText("http://x.com/a.png"), "http://x.com/a.png");
});

test("mediaUrlFromText: ordinary text with a link is left as text", () => {
  assert.equal(mediaUrlFromText("look at https://x.com/a.gif"), null);
});

test("mediaUrlFromText: a non-media link is left as text", () => {
  assert.equal(mediaUrlFromText("https://example.com/page"), null);
});

test("fromExtra: an unknown type falls back to text, not a phantom kind", () => {
  assert.equal(fromExtra({ ...extraGif, type: "wat" }).kind, "text");
});

test("reactionKey: main ids pass through unchanged", () => {
  assert.equal(reactionKey({ store: "main", id: 5 }), 5);
});

test("reactionKey: extra ids move into a disjoint high range", () => {
  assert.equal(reactionKey({ store: "extra", id: 5 }), EXTRA_ID_OFFSET + 5);
});

// The whole point of the offset: same raw id, two stores, must not collide.
test("reactionKey: same id in the two stores never collides", () => {
  assert.notEqual(reactionKey({ store: "main", id: 5 }), reactionKey({ store: "extra", id: 5 }));
});

// Pins the assumption the offset relies on: real /Chat ids stay well under a billion.
test("reactionKey: the offset dwarfs any realistic main message id", () => {
  assert.ok(reactionKey({ store: "extra", id: 1 }) > reactionKey({ store: "main", id: 900_000_000 }));
});

const me = { id: "me", userName: "ann" };

test("toggleReaction: adding my first reaction sets mine and a count of 1", () => {
  const r = toggleReaction(null, "❤️", me);
  assert.equal(r.mine, "❤️");
  assert.equal(r.total, 1);
  assert.deepEqual(r.summary, [{ emoji: "❤️", count: 1 }]);
});

test("toggleReaction: picking the same emoji again removes it", () => {
  const once = toggleReaction(null, "❤️", me);
  const twice = toggleReaction(once, "❤️", me);
  assert.equal(twice.mine, null);
  assert.equal(twice.total, 0);
});

test("toggleReaction: a different emoji replaces mine, never stacks two", () => {
  const heart = toggleReaction(null, "❤️", me);
  const laugh = toggleReaction(heart, "😂", me);
  assert.equal(laugh.mine, "😂");
  assert.equal(laugh.total, 1);
  assert.deepEqual(laugh.summary, [{ emoji: "😂", count: 1 }]);
});

test("toggleReaction: my reaction adds onto someone else's, not over it", () => {
  const theirs: MessageReactions = {
    total: 1,
    summary: [{ emoji: "❤️", count: 1 }],
    mine: null,
    reactions: [{ id: 1, messageId: 5, userId: "you", userName: "bob", emoji: "❤️", createdAt: "2026-07-17T10:00:00" }],
  };
  const mineToo = toggleReaction(theirs, "❤️", me);
  assert.equal(mineToo.total, 2);
  assert.deepEqual(mineToo.summary, [{ emoji: "❤️", count: 2 }]);
});
