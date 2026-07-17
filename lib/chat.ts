import type { ChatListItem } from "./types";

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
