import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReaction, EMPTY_REACTIONS } from "./storyReactions.ts";
import type { StoryReactions } from "./types.ts";

const of = (mine: string | null, summary: [string, number][]): StoryReactions => ({
  total: summary.reduce((n, [, c]) => n + c, 0),
  summary: summary.map(([emoji, count]) => ({ emoji, count })),
  mine,
  reactions: [],
});

test("first reaction on a story counts one and becomes mine", () => {
  const r = applyReaction(null, "😍");
  assert.equal(r.mine, "😍");
  assert.equal(r.total, 1);
  assert.deepEqual(r.summary, [{ emoji: "😍", count: 1 }]);
});

test("tapping my own emoji again clears it", () => {
  const r = applyReaction(of("😍", [["😍", 1]]), "😍");
  assert.equal(r.mine, null);
  assert.equal(r.total, 0);
  assert.deepEqual(r.summary, []);
});

test("switching emoji moves my vote instead of adding a second", () => {
  const r = applyReaction(of("😍", [["😍", 1]]), "🔥");
  assert.equal(r.mine, "🔥");
  assert.equal(r.total, 1, "one user still holds exactly one reaction");
  assert.deepEqual(r.summary, [{ emoji: "🔥", count: 1 }]);
});

test("my vote leaves other people's counts alone", () => {
  const r = applyReaction(of("😍", [["😍", 3], ["🔥", 2]]), "🔥");
  assert.deepEqual(r.summary, [{ emoji: "😍", count: 2 }, { emoji: "🔥", count: 3 }]);
  assert.equal(r.total, 5);
});

test("reacting alongside others keeps their tally", () => {
  const r = applyReaction(of(null, [["👏", 4]]), "👏");
  assert.deepEqual(r.summary, [{ emoji: "👏", count: 5 }]);
  assert.equal(r.mine, "👏");
});

test("clearing the last holder drops the emoji from the summary", () => {
  const r = applyReaction(of("😢", [["😢", 1], ["🔥", 2]]), "😢");
  assert.deepEqual(r.summary, [{ emoji: "🔥", count: 2 }]);
});

test("EMPTY_REACTIONS is not mutated by use", () => {
  applyReaction(EMPTY_REACTIONS, "😮");
  assert.deepEqual(EMPTY_REACTIONS, { total: 0, summary: [], mine: null, reactions: [] });
});
