import { test } from "node:test";
import assert from "node:assert/strict";
import { timeAgo, formatCount, isVideo, seedGradient, initial, parseApiDate } from "./utils.ts";

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
/** How the extra backend sends it: same instant, no zone marker. */
const zoneless = (ms: number) => new Date(Date.now() - ms).toISOString().replace("Z", "");

test("parseApiDate reads a zoneless backend timestamp as UTC, not local", () => {
  // The whole point: these two spell the same instant, and must parse alike.
  // Read as local, a fresh story ages by the viewer's UTC offset (5h in UTC+5).
  const iso = "2026-07-17T10:49:58.370Z";
  assert.equal(parseApiDate("2026-07-17T10:49:58.370"), Date.parse(iso));
});

test("parseApiDate leaves timestamps that already carry a zone alone", () => {
  assert.equal(parseApiDate("2026-03-14T07:30:00.035Z"), Date.parse("2026-03-14T07:30:00.035Z"));
  assert.equal(parseApiDate("2026-03-14T12:30:00.035+05:00"), Date.parse("2026-03-14T07:30:00.035Z"));
});

test("parseApiDate leaves date-only strings alone (already UTC by spec)", () => {
  assert.equal(parseApiDate("2026-07-17"), Date.parse("2026-07-17"));
});

test("parseApiDate is NaN for missing or unreadable input", () => {
  assert.ok(Number.isNaN(parseApiDate()));
  assert.ok(Number.isNaN(parseApiDate("")));
  assert.ok(Number.isNaN(parseApiDate("not a date")));
});

test("timeAgo reads a just-posted zoneless story as seconds old, not hours", () => {
  // Regression: this read "5h" for a fresh story in UTC+5 before parseApiDate.
  assert.match(timeAgo(zoneless(3_000)), /^\ds$/);
  assert.equal(timeAgo(zoneless(2 * 3600e3)), "2h");
});

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
