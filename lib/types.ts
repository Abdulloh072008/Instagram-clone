// Types mirror the real JSON shapes returned by instagram-api.softclub.tj.

export interface Envelope<T> {
  data: T;
  errors: string[];
  statusCode: number;
}

export interface Paged<T> {
  pageNumber: number;
  pageSize: number;
  totalPage: number;
  totalRecord: number;
  data: T[];
  errors: string[];
  statusCode: number;
}

export interface PostComment {
  postCommentId: number;
  userId: string;
  userName: string;
  userImage: string | null;
  dateCommented: string;
  comment: string;
}

export interface Post {
  postId: number;
  userId: string;
  userName: string;
  userImage: string | null;
  datePublished: string;
  images: string[];
  postLike: boolean;
  postLikeCount: number;
  userLikes: unknown;
  commentCount: number;
  comments: PostComment[];
  postView: number;
  userViews: unknown;
  postFavorite: boolean;
  userFavorite: unknown;
  title: string | null;
  content: string | null;
}

// Repost (extra backend). GET /Repost/user -> Envelope<Repost[]>;
// GET /Repost/get -> Envelope<RepostState>.
export interface Repost {
  userId: string;
  userName: string;
  postId: number;
  originalAuthorId: string;
  originalAuthorName: string;
  caption: string | null;
}

export interface RepostState {
  total: number;
  mine: boolean;
  reposts: Repost[];
}

export interface UserProfile {
  userName: string;
  image: string | null;
  dateUpdated: string;
  gender: string;
  postCount: number;
  subscribersCount: number;
  subscriptionsCount: number;
  firstName: string | null;
  lastName: string | null;
  locationId: number | null;
  dob: string | null;
  occupation: string | null;
  about: string | null;
}

export interface UserListItem {
  id: string;
  avatar: string | null;
  fullName: string | null;
  subscribersCount: number;
  userName: string;
}

/**
 * Item from /FollowingRelationShip/get-subscribers|get-subscriptions.
 * Verified against the live API: `id` is the RELATIONSHIP id (e.g. 5834), not
 * the user — the user lives in userShortInfo. Reading `id` as a user id matches
 * nobody.
 */
export interface FollowListItem {
  id: number;
  userShortInfo: {
    userId: string;
    userName: string;
    userPhoto: string;
    fullname: string;
  };
}

export interface StoryItem {
  storyId?: number;
  id?: number;
  postId?: number;
  fileName?: string;
  image?: string;
  createAt?: string;
  dateCreated?: string;
  storyView?: number;
  storyLike?: boolean;
  // --- extra backend (/StoryExtra) ---
  mediaUrl?: string; // rooted path, e.g. "/uploads/x.png"
  type?: "image" | "video";
  caption?: string;
  createdAt?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

/** /StoryInteract/get-reactions — emoji tallies plus the caller's own pick. */
export interface StoryReactions {
  total: number;
  summary: { emoji: string; count: number }[];
  mine: string | null;
  reactions: {
    id: number;
    storyId: number;
    userId: string;
    userName: string;
    emoji: string;
    createdAt: string;
  }[];
}

export interface UserStories {
  userId: string;
  userName: string;
  userImage: string | null;
  stories: StoryItem[];
}

// Item from /Chat/get-chats
export interface ChatListItem {
  chatId: number;
  sendUserId: string;
  sendUserName: string;
  sendUserImage: string | null;
  receiveUserId: string;
  receiveUserName: string;
  receiveUserImage: string | null;
}

// Message item from /Chat/get-chat-by-id (note the API's `sendMassageDate` spelling)
export interface ChatMessage {
  chatId: number;
  messageId: number;
  userId: string;
  userName: string;
  userImage: string | null;
  messageText: string;
  sendMassageDate: string;
  file: string | null;
}

// Message from the extra backend's parallel store (/ChatExtra/get). No JWT, so
// the sender travels explicitly; carries the types the main store can't hold.
// Note: createdAt comes back WITHOUT a trailing Z — always parseApiDate it.
export interface ExtraMessage {
  id: number;
  chatId: number;
  senderId: string;
  senderName: string;
  type: string;
  text: string | null;
  mediaUrl: string | null;
  fileName: string | null;
  durationSec: number | null;
  createdAt: string;
}

// What a message can be, once the two stores are merged. "seen" is a read-
// receipt marker, not a real bubble — mergeThread keeps it out of the thread.
export type MessageKind = "text" | "image" | "gif" | "voice" | "sticker" | "seen";

/**
 * One thread item, normalized from either store so the UI treats them alike.
 * `store` + `id` say where it really lives (for delete/react); `key` is a
 * React key unique across both stores; `at` is the parsed epoch-ms for sorting.
 */
export interface UnifiedMessage {
  key: string;
  store: "main" | "extra";
  id: number;
  userId: string;
  userName: string;
  userImage: string | null;
  text: string;
  file: string | null;
  kind: MessageKind;
  at: number;
  date: string;
  durationSec: number | null;
  sending?: boolean;
}

// /MessageReaction/get — same tally shape the story reactions use.
export interface MessageReactions {
  total: number;
  summary: { emoji: string; count: number }[];
  mine: string | null;
  reactions: { id: number; messageId: number; userId: string; userName: string; emoji: string; createdAt: string }[];
}

// /Gif/search|trending — Giphy-backed.
export interface GifItem {
  id: string;
  url: string;
  preview: string;
  title: string;
  width: number;
  height: number;
}

export type NotificationType = "like" | "comment" | "follow" | "mention";

// Matches BACKEND-SPEC.md §1 (Notification controller — pending on the backend).
export interface AppNotification {
  notificationId: number;
  type: NotificationType;
  fromUserId: string;
  fromUserName: string;
  fromUserImage: string | null;
  postId?: number | null;
  postImage?: string | null; // optional thumbnail if the backend includes it
  commentId?: number | null;
  text?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Decoded fields we care about from the JWT payload. */
export interface AuthUser {
  id: string; // sid claim
  userName: string; // name claim
  email: string;
  role: string;
  image?: string | null; // profile photo, fetched after auth (not in the JWT)
}
