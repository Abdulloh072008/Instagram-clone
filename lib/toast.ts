// Toast store. Plain module state rather than context: every caller is an event
// handler in a catch block, so toast() staying a plain function keeps those call
// sites to one line and needs no provider threaded through the tree. Lives in
// lib (not next to <Toaster/>) so it stays free of JSX and testable.
export type Tone = "error" | "ok";
export type Item = { id: number; text: string; tone: Tone };

const TTL_MS = 4000;

let items: Item[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Show a toast. Errors are the common case, so that's the default tone. */
export function toast(text: string, tone: Tone = "error") {
  const id = nextId++;
  items = [...items, { id, text, tone }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, TTL_MS);
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** New identity only when the list actually changes, as useSyncExternalStore requires. */
export const getToasts = () => items;

/** Stable reference — a fresh array here would loop useSyncExternalStore on the server. */
export const EMPTY: Item[] = [];
