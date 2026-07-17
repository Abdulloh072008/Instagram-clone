import { test } from "node:test";
import assert from "node:assert/strict";
import { otherUser, isNearBottom, threadChanged, buildThread, dayKey, previewText, sortByActivity } from "./chat.ts";
import type { ThreadRow } from "./chat.ts";
import type { ChatListItem, ChatMessage } from "./types.ts";

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

const msg = (id: number): ChatMessage => ({
  chatId: 1,
  messageId: id,
  userId: "me",
  userName: "ann",
  userImage: null,
  messageText: "hi",
  sendMassageDate: "2026-07-17T10:00:00",
  file: null,
});

test("threadChanged: a new message at the end counts as changed", () => {
  assert.equal(threadChanged([msg(1)], [msg(1), msg(2)]), true);
});

test("threadChanged: the same thread re-fetched is not a change", () => {
  assert.equal(threadChanged([msg(1), msg(2)], [msg(1), msg(2)]), false);
});

test("threadChanged: two empty polls are not a change", () => {
  assert.equal(threadChanged([], []), false);
});

function mkMsg(id: number, userId: string, date: string): ChatMessage {
  return {
    chatId: 1,
    messageId: id,
    userId,
    userName: userId,
    userImage: null,
    messageText: "x",
    sendMassageDate: date,
    file: null,
  };
}
const onlyMessages = (rows: ThreadRow[]) => rows.filter((r) => r.kind === "message") as Extract<ThreadRow, { kind: "message" }>[];

test("buildThread: consecutive messages from the same sender group together", () => {
  const rows = onlyMessages(
    buildThread(
      [mkMsg(1, "me", "2026-07-17T10:00:00"), mkMsg(2, "me", "2026-07-17T10:01:00")],
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
      [mkMsg(1, "me", "2026-07-17T10:00:00"), mkMsg(2, "you", "2026-07-17T10:01:00")],
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
      [mkMsg(1, "me", "2026-07-17T10:00:00"), mkMsg(2, "me", "2026-07-17T10:30:00")],
      "me",
      Date.parse("2026-07-17T11:00:00Z"),
    ),
  );
  assert.equal(rows[0].endsGroup, true);
  assert.equal(rows[1].startsGroup, true);
});

test("buildThread: a new day inserts one date separator before the message", () => {
  const rows = buildThread(
    [mkMsg(1, "me", "2026-07-16T10:00:00"), mkMsg(2, "me", "2026-07-17T10:00:00")],
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
  assert.equal(previewText(mkMsg(1, "me", "2026-07-17T10:00:00"), "me"), "You: x");
});

test("previewText: a message from the other side has no prefix", () => {
  assert.equal(previewText(mkMsg(1, "you", "2026-07-17T10:00:00"), "me"), "x");
});

test("previewText: a photo with no text collapses to a label", () => {
  const photo = { ...mkMsg(1, "you", "2026-07-17T10:00:00"), messageText: "", file: "/x.jpg" };
  assert.equal(previewText(photo, "me"), "📷 Photo");
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
