import { test } from "node:test";
import assert from "node:assert/strict";
import { timeAgo, formatCount, isVideo, seedGradient, initial } from "./utils.ts";

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

test("timeAgo picks the right unit at each boundary", () => {
  assert.equal(timeAgo(ago(5_000)), "5s");
  assert.equal(timeAgo(ago(90_000)), "1m");
  assert.equal(timeAgo(ago(2 * 3600e3)), "2h");
  assert.equal(timeAgo(ago(3 * 86400e3)), "3d");
  assert.equal(timeAgo(ago(14 * 86400e3)), "2w");
});

test("timeAgo falls back to a calendar date past 5 weeks", () => {
  const old = timeAgo(ago(400 * 86400e3));
  assert.ok(!/^\d+[smhdw]$/.test(old), `expected a date, got ${old}`);
  assert.match(old, /\d/);
});

test("timeAgo is blank for missing or unparseable input", () => {
  assert.equal(timeAgo(), "");
  assert.equal(timeAgo(null), "");
  assert.equal(timeAgo(""), "");
  assert.equal(timeAgo("not a date"), "");
});

test("timeAgo clamps future timestamps instead of going negative", () => {
  assert.equal(timeAgo(new Date(Date.now() + 60_000).toISOString()), "0s");
});

test("formatCount groups thousands and treats missing as zero", () => {
  assert.equal(formatCount(1234), "1,234");
  assert.equal(formatCount(1_234_567), "1,234,567");
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(), "0");
  assert.equal(formatCount(null), "0");
});

test("isVideo matches video extensions regardless of case", () => {
  for (const name of ["a.mp4", "a.webm", "a.mov", "a.m4v", "a.ogg", "CLIP.MP4"]) {
    assert.equal(isVideo(name), true, name);
  }
});

test("isVideo rejects images, blanks, and extensions that aren't at the end", () => {
  for (const name of ["a.jpg", "a.png", "a.gif", ""]) assert.equal(isVideo(name), false, name);
  assert.equal(isVideo(), false);
  assert.equal(isVideo(null), false);
  assert.equal(isVideo("mp4.jpg"), false);
});

test("seedGradient is stable per seed and differs across seeds", () => {
  assert.equal(seedGradient("ann"), seedGradient("ann"));
  assert.notEqual(seedGradient("ann"), seedGradient("bob"));
});

test("seedGradient keeps hues inside 0-359 for awkward seeds", () => {
  for (const seed of ["", "z".repeat(200), "🙂", "-1"]) {
    const hues = [...seedGradient(seed).matchAll(/hsl\((\d+)/g)].map((m) => Number(m[1]));
    assert.equal(hues.length, 2, seed);
    for (const h of hues) assert.ok(h >= 0 && h < 360, `${seed} -> ${h}`);
  }
});

test("initial takes the first letter, trimmed and uppercased", () => {
  assert.equal(initial("ann"), "A");
  assert.equal(initial("  bob"), "B");
  assert.equal(initial(), "?");
  assert.equal(initial(""), "?");
  assert.equal(initial("   "), "?");
});
