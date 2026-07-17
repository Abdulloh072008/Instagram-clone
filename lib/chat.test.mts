import { test } from "node:test";
import assert from "node:assert/strict";
import { otherUser } from "./chat.ts";
import type { ChatListItem } from "./types.ts";

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
