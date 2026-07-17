import type { ChatListItem, ChatMessage } from "./types";

/**
 * A chat row names both sides; which one is "the other person" depends on
 * whether I sent or received. Get this backwards and every chat shows your own
 * name, so it lives here with a test rather than inline in the list.
 */
export function otherUser(chat: ChatListItem, myId?: string) {
  const iAmSender = chat.sendUserId === myId;
  return {
    id: iAmSender ? chat.receiveUserId : chat.sendUserId,
    name: iAmSender ? chat.receiveUserName : chat.sendUserName,
    image: iAmSender ? chat.receiveUserImage : chat.sendUserImage,
  };
}

/**
 * The thread polls every few seconds and rebuilds its message array even when
 * nothing changed. Auto-scrolling on every rebuild yanks you to the bottom
 * mid-read. Only follow new messages when you were already parked near the
 * bottom — same rule Instagram uses. `threshold` is in px from the bottom.
 */
export function isNearBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }, threshold = 120) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/**
 * Two consecutive polls describe the same thread unless a message was added or
 * removed. Comparing the last id and the length is enough to tell "genuinely
 * new" from "same array, fresh reference", so the UI can skip re-render churn
 * and the auto-scroll decision.
 */
export function threadChanged(prev: ChatMessage[], next: ChatMessage[]) {
  if (prev.length !== next.length) return true;
  if (next.length === 0) return false;
  return prev[prev.length - 1]?.messageId !== next[next.length - 1]?.messageId;
}
