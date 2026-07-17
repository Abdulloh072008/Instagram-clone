import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { storyKey, loadSeen, saveSeen, freshStories, followedStories } from "./seenStories.ts";
import type { StoryItem, UserStories } from "./types.ts";

// Node has no localStorage/window; both are read at call time, so a global stub
// set once is enough for every test in this file.
const store = new Map<string, string>();
Object.assign(globalThis, {
  window: globalThis,
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  },
});

beforeEach(() => store.clear());

test("storyKey prefers storyId and falls back to id", () => {
  assert.equal(storyKey({ storyId: 7, id: 9 } as StoryItem), 7);
  assert.equal(storyKey({ id: 9 } as StoryItem), 9);
  assert.equal(storyKey({} as StoryItem), undefined);
});

test("saveSeen then loadSeen round-trips the watched ids", () => {
  saveSeen(new Set([3, 1, 2]));
  assert.deepEqual([...loadSeen()].sort(), [1, 2, 3]);
});

test("loadSeen is empty when nothing has been watched yet", () => {
  assert.equal(loadSeen().size, 0);
});

test("loadSeen recovers from corrupt storage instead of throwing", () => {
  store.set("seenStories", "{not json");
  assert.equal(loadSeen().size, 0);
});

const group = (dates: (string | undefined)[]): UserStories => ({
  userId: "u1",
  userName: "ann",
  userImage: null,
  stories: dates.map((createAt, i) => ({ storyId: i + 1, createAt })) as StoryItem[],
});

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();

test("freshStories keeps stories posted within 24h", () => {
  const [g] = freshStories([group([hoursAgo(1), hoursAgo(23)])]);
  assert.equal(g.stories.length, 2);
});

test("freshStories drops stories older than 24h", () => {
  const [g] = freshStories([group([hoursAgo(1), hoursAgo(25)])]);
  assert.deepEqual(
    g.stories.map((s) => s.storyId),
    [1],
  );
});

test("freshStories drops a user whose stories have all expired", () => {
  assert.deepEqual(freshStories([group([hoursAgo(30), hoursAgo(48)])]), []);
});

test("freshStories keeps stories with an unreadable date rather than hiding them", () => {
  const [g] = freshStories([group(["not a date", undefined])]);
  assert.equal(g.stories.length, 2);
});

test("freshStories reads the extra backend's createdAt", () => {
  const stale: UserStories = {
    userId: "u1",
    userName: "ann",
    userImage: null,
    stories: [{ id: 1, createdAt: hoursAgo(30) }, { id: 2, createdAt: hoursAgo(2) }] as StoryItem[],
  };
  const [g] = freshStories([stale]);
  assert.deepEqual(
    g.stories.map((s) => s.id),
    [2],
  );
});

test("freshStories reads dateCreated when createAt is absent", () => {
  const stale: UserStories = {
    userId: "u1",
    userName: "ann",
    userImage: null,
    stories: [{ storyId: 1, dateCreated: hoursAgo(30) }] as StoryItem[],
  };
  assert.deepEqual(freshStories([stale]), []);
});

test("freshStories leaves the caller's array and groups untouched", () => {
  const input = [group([hoursAgo(1), hoursAgo(30)])];
  freshStories(input);
  assert.equal(input[0].stories.length, 2);
});

const by = (userId: string): UserStories => ({
  userId,
  userName: userId,
  userImage: null,
  stories: [{ storyId: 1, createdAt: hoursAgo(1) }] as StoryItem[],
});

test("followedStories keeps only the people you follow", () => {
  const feed = [by("ann"), by("stranger"), by("bob")];
  assert.deepEqual(
    followedStories(feed, ["ann", "bob"]).map((g) => g.userId),
    ["ann", "bob"],
  );
});

test("followedStories keeps your own stories even though you don't follow yourself", () => {
  const feed = [by("me"), by("stranger")];
  assert.deepEqual(
    followedStories(feed, [], "me").map((g) => g.userId),
    ["me"],
  );
});

test("followedStories drops everyone when you follow nobody", () => {
  assert.deepEqual(followedStories([by("stranger")], []), []);
});

test("followedStories ignores people you follow who have no stories", () => {
  assert.deepEqual(
    followedStories([by("ann")], ["ann", "ghost"]).map((g) => g.userId),
    ["ann"],
  );
});
