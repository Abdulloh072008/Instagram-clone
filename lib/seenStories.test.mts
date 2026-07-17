import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  storyKey,
  loadSeen,
  saveSeen,
  freshStories,
  followedStories,
  storyExpiry,
  nextExpiry,
} from "./seenStories.ts";
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

const inHours = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();

test("storyExpiry follows the server's expiresAt over its own 24h guess", () => {
  // Server says it dies in an hour even though it was posted 10h ago: server wins.
  const expiresAt = inHours(1);
  const s = { id: 1, createdAt: hoursAgo(10), expiresAt } as StoryItem;
  assert.equal(storyExpiry(s), Date.parse(expiresAt));
});

test("storyExpiry falls back to 24h after posting when expiresAt is absent", () => {
  const createdAt = hoursAgo(10);
  assert.equal(storyExpiry({ id: 1, createdAt } as StoryItem), Date.parse(createdAt) + 24 * 3600e3);
});

test("storyExpiry treats an unreadable date as never expiring", () => {
  assert.equal(storyExpiry({ id: 1, createdAt: "nonsense" } as StoryItem), Infinity);
  assert.equal(storyExpiry({ id: 1 } as StoryItem), Infinity);
});

test("freshStories drops a story whose server expiresAt has passed", () => {
  const g: UserStories = {
    userId: "u1",
    userName: "ann",
    userImage: null,
    stories: [
      { id: 1, createdAt: hoursAgo(1), expiresAt: inHours(-1) },
      { id: 2, createdAt: hoursAgo(1), expiresAt: inHours(5) },
    ] as StoryItem[],
  };
  assert.deepEqual(
    freshStories([g])[0].stories.map((s) => s.id),
    [2],
  );
});

test("freshStories judges against the clock it is given", () => {
  const g: UserStories = {
    userId: "u1",
    userName: "ann",
    userImage: null,
    stories: [{ id: 1, expiresAt: inHours(2) }] as StoryItem[],
  };
  assert.equal(freshStories([g], Date.now()).length, 1, "alive now");
  assert.deepEqual(freshStories([g], Date.now() + 3 * 3600e3), [], "gone 3h from now");
});

test("nextExpiry reports the soonest story to lapse", () => {
  const soonest = inHours(2);
  const g: UserStories = {
    userId: "u1",
    userName: "ann",
    userImage: null,
    stories: [{ id: 1, expiresAt: inHours(5) }, { id: 2, expiresAt: soonest }] as StoryItem[],
  };
  assert.equal(nextExpiry([g]), Date.parse(soonest));
});

test("nextExpiry is Infinity when nothing will expire", () => {
  assert.equal(nextExpiry([]), Infinity);
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
