import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { toast, subscribe, getToasts } from "./toast.ts";

// Module state is shared across tests; drain it by running every pending TTL.
beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => {
  mock.timers.tick(10_000);
  mock.timers.reset();
});

test("toast shows the message and drops it after the TTL", () => {
  toast("boom");
  assert.deepEqual(
    getToasts().map((t) => t.text),
    ["boom"],
  );
  mock.timers.tick(4000);
  assert.deepEqual(getToasts(), []);
});

test("toast defaults to the error tone and takes ok explicitly", () => {
  toast("failed");
  toast("saved", "ok");
  assert.deepEqual(
    getToasts().map((t) => t.tone),
    ["error", "ok"],
  );
});

test("each toast expires on its own clock, not the newest one's", () => {
  toast("first");
  mock.timers.tick(3000);
  toast("second");
  mock.timers.tick(1000); // first is now 4s old, second only 1s

  assert.deepEqual(
    getToasts().map((t) => t.text),
    ["second"],
  );
});

test("same text twice stays two toasts and expires both", () => {
  toast("same");
  toast("same");
  assert.equal(getToasts().length, 2);
  mock.timers.tick(4000);
  assert.deepEqual(getToasts(), []);
});

test("subscribers are notified on show and on expiry, until they unsubscribe", () => {
  let calls = 0;
  const stop = subscribe(() => calls++);

  toast("x");
  assert.equal(calls, 1);
  mock.timers.tick(4000);
  assert.equal(calls, 2);

  stop();
  toast("y");
  assert.equal(calls, 2);
});

// useSyncExternalStore loops forever if the snapshot changes identity every read.
test("getToasts keeps the same reference until the list changes", () => {
  toast("x");
  assert.equal(getToasts(), getToasts());
});
