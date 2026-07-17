import { test } from "node:test";
import assert from "node:assert/strict";
import { otherUser, isNearBottom, threadChanged } from "./chat.ts";
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
