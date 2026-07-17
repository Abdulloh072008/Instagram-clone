// Typed wrappers around every backend endpoint the UI uses.
import { api, extraApi } from "./client";
import type {
  AppNotification,
  ChatListItem,
  ChatMessage,
  Envelope,
  Paged,
  Post,
  Repost,
  RepostState,
  UserListItem,
  UserProfile,
  UserStories,
} from "./types";

// ---------- Posts ----------
export const posts = {
  feed: (pageNumber = 1, pageSize = 10) =>
    api.get<Paged<Post>>("/Post/get-posts", { PageNumber: pageNumber, PageSize: pageSize }),

  following: (userId: string, pageNumber = 1, pageSize = 10) =>
    api.get<Paged<Post>>("/Post/get-following-post", {
      UserId: userId,
      PageNumber: pageNumber,
      PageSize: pageSize,
    }),

  // get-reels returns `images` as a single string, not an array — normalize it so the UI can treat it uniformly.
  reels: (pageNumber = 1, pageSize = 10) =>
    api
      .get<Paged<Post>>("/Post/get-reels", { PageNumber: pageNumber, PageSize: pageSize })
      .then((res) => ({
        ...res,
        data: (res.data ?? []).map((p) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : p.images ? [p.images as string] : [],
        })),
      })),

  // get-my-posts returns a bare array (no pagination envelope) and ignores query params.
  mine: () => api.get<Post[]>("/Post/get-my-posts"),

  byUser: (userId: string, pageNumber = 1, pageSize = 30) =>
    api.get<Paged<Post>>("/Post/get-posts", {
      UserId: userId,
      PageNumber: pageNumber,
      PageSize: pageSize,
    }),

  byId: (postId: number) =>
    api.get<Envelope<Post>>("/Post/get-post-by-id", { id: postId }),

  like: (postId: number) => api.postJson("/Post/like-post", undefined, { postId }),
  view: (postId: number) => api.postJson("/Post/view-post", undefined, { postId }),
  favorite: (postId: number) => api.postJson("/Post/add-post-favorite", { postId }),

  addComment: (postId: number, comment: string) =>
    api.postJson("/Post/add-comment", { postId, comment }),
  deleteComment: (commentId: number) =>
    api.del("/Post/delete-comment", { commentId }),

  create: (title: string, content: string, images: File[]) => {
    const form = new FormData();
    form.append("Title", title);
    form.append("Content", content);
    for (const img of images) form.append("Images", img);
    return api.postForm("/Post/add-post", form);
  },

  remove: (postId: number) => api.del("/Post/delete-post", { id: postId }),
};

// ---------- Reposts (extra backend) ----------
export const reposts = {
  add: (post: Post, userId: string, userName: string, caption = "") =>
    extraApi.postJson("/Repost/add", {
      userId,
      userName,
      postId: post.postId,
      originalAuthorId: post.userId,
      originalAuthorName: post.userName,
      caption,
    }),
  remove: (userId: string, postId: number) =>
    extraApi.del("/Repost/remove", { userId, postId }),
  state: (postId: number, userId: string) =>
    extraApi.get<Envelope<RepostState>>("/Repost/get", { postId, userId }),
  byUser: (userId: string) => extraApi.get<Envelope<Repost[]>>("/Repost/user", { userId }),
};

// ---------- Calls / reactions / GIF / stickers (extra backend) ----------
export interface CallDto {
  id: number;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: "video" | "audio";
  status: "ringing" | "accepted" | "declined" | "ended" | "missed";
  createdAt: string;
  endedAt: string | null;
}
export interface GifDto { id: string; url: string; preview: string; title: string; width: number; height: number }
export interface StickerDto { id: number; pack: string; name: string; url: string }
export interface MsgReactions { total: number; summary: { emoji: string; count: number }[]; mine: string | null }

export const calls = {
  start: (payload: { callerId: string; callerName: string; calleeId: string; calleeName: string; type: "video" | "audio" }) =>
    extraApi.postJson<Envelope<CallDto>>("/Call/start", payload),
  incoming: (userId: string) => extraApi.get<Envelope<CallDto[]>>("/Call/incoming", { userId }),
  get: (callId: number) => extraApi.get<Envelope<CallDto>>("/Call/get", { callId }),
  accept: (callId: number) => extraApi.putJson<Envelope<CallDto>>("/Call/accept", undefined, { callId }),
  decline: (callId: number) => extraApi.putJson<Envelope<CallDto>>("/Call/decline", undefined, { callId }),
  end: (callId: number) => extraApi.putJson<Envelope<CallDto>>("/Call/end", undefined, { callId }),
};

export const messageReactions = {
  add: (messageId: number, userId: string, userName: string, emoji: string) =>
    extraApi.postJson("/MessageReaction/add", { messageId, userId, userName, emoji }),
  get: (messageId: number, userId: string) =>
    extraApi.get<Envelope<MsgReactions>>("/MessageReaction/get", { messageId, userId }),
  remove: (messageId: number, userId: string) =>
    extraApi.del("/MessageReaction/remove", { messageId, userId }),
};

export const gifs = {
  search: (q: string, limit = 24) => extraApi.get<Envelope<GifDto[]>>("/Gif/search", { q, limit }),
  trending: (limit = 24) => extraApi.get<Envelope<GifDto[]>>("/Gif/trending", { limit }),
};

export const stickerCatalog = {
  get: (pack?: string) => extraApi.get<Envelope<StickerDto[]>>("/Sticker/get", { pack }),
};

// ---------- Comment replies / threads (extra backend) ----------
export interface CommentReplyDto {
  id: number; postId: number; postCommentId: number;
  userId: string; userName: string; userImage: string | null; text: string; createdAt: string;
}
export const commentReplies = {
  add: (postId: number, postCommentId: number, userId: string, userName: string, userImage: string | null, text: string) =>
    extraApi.postJson<Envelope<CommentReplyDto>>("/CommentReply/add", { postId, postCommentId, userId, userName, userImage, text }),
  byPost: (postId: number) => extraApi.get<Envelope<CommentReplyDto[]>>("/CommentReply/by-post", { postId }),
};

// ---------- Saved collections (extra backend) ----------
export interface CollectionDto { id: number; userId: string; name: string; coverUrl: string | null; createdAt: string; postIds: number[] }

export const collections = {
  create: (userId: string, name: string, postIds: number[], coverUrl?: string) =>
    extraApi.postJson<Envelope<CollectionDto>>("/Collection/create", { userId, name, coverUrl, postIds }),
  byUser: (userId: string) => extraApi.get<Envelope<CollectionDto[]>>("/Collection/by-user", { userId }),
  addItem: (collectionId: number, postId: number) => extraApi.postJson("/Collection/add-item", undefined, { collectionId, postId }),
  removeItem: (collectionId: number, postId: number) => extraApi.del("/Collection/remove-item", { collectionId, postId }),
  delete: (id: number) => extraApi.del("/Collection/delete", { id }),
};

// ---------- Highlights (extra backend) — pinned story collections ----------
export interface HighlightItemDto { id: number; highlightId: number; mediaUrl: string; type: string; createdAt: string }
export interface HighlightDto { id: number; userId: string; title: string; coverUrl: string | null; createdAt: string; items: HighlightItemDto[] }

export const highlights = {
  create: (userId: string, title: string, items: { mediaUrl: string; type: string }[], coverUrl?: string) =>
    extraApi.postJson<Envelope<HighlightDto>>("/Highlight/create", { userId, title, coverUrl, items }),
  byUser: (userId: string) => extraApi.get<Envelope<HighlightDto[]>>("/Highlight/by-user", { userId }),
  delete: (id: number) => extraApi.del("/Highlight/delete", { id }),
};

// ---------- Blocks / reports (extra backend) ----------
export const blocks = {
  add: (userId: string, blockedUserId: string) => extraApi.postJson("/Block/add", undefined, { userId, blockedUserId }),
  remove: (userId: string, blockedUserId: string) => extraApi.del("/Block/remove", { userId, blockedUserId }),
  list: (userId: string) => extraApi.get<Envelope<string[]>>("/Block/list", { userId }),
  isBlocked: (userId: string, otherId: string) => extraApi.get<Envelope<boolean>>("/Block/is-blocked", { userId, otherId }),
};
export const reportsApi = {
  add: (reporterId: string, targetType: string, targetId: string, reason: string) =>
    extraApi.postJson("/Report/add", { reporterId, targetType, targetId, reason }),
};

// ---------- Not interested (extra backend) — hide posts from the feed ----------
export const notInterested = {
  add: (userId: string, postId: number) =>
    extraApi.postJson("/NotInterested/add", undefined, { userId, postId }),
  remove: (userId: string, postId: number) =>
    extraApi.del("/NotInterested/remove", { userId, postId }),
  list: (userId: string) => extraApi.get<Envelope<number[]>>("/NotInterested/get", { userId }),
};

// ---------- Stories ----------
export const stories = {
  all: () => api.get<UserStories[]>("/Story/get-stories"),
  mine: () => api.get<UserStories[]>("/Story/get-my-stories"),
  byUser: (userId: string) => api.get<UserStories>(`/Story/get-user-stories/${userId}`),
  like: (storyId: number) => api.postJson("/Story/LikeStory", undefined, { storyId }),
  view: (storyId: number) => api.postJson("/Story/add-story-view", undefined, { storyId }),
  add: (image: File, postId?: number) => {
    const form = new FormData();
    form.append("Image", image);
    return api.postForm("/Story/AddStories", form, { PostId: postId });
  },
  remove: (id: number) => api.del("/Story/DeleteStory", { id }),

  // Real story interactions (companion backend /StoryInteract/*).
  react: (userId: string, userName: string, storyId: number, emoji: string) =>
    extraApi.postJson("/StoryInteract/react", { storyId, userId, userName, emoji }),
  reactions: (storyId: number, userId: string) =>
    extraApi.get<Envelope<{ total: number; summary: { emoji: string; count: number }[]; mine: string | null }>>(
      "/StoryInteract/get-reactions",
      { storyId, userId },
    ),
  removeReaction: (userId: string, storyId: number) =>
    extraApi.del("/StoryInteract/remove-reaction", { storyId, userId }),
  // Reply is delivered to the story author (not a comment on a post anymore).
  reply: (storyId: number, ownerUserId: string, fromUserId: string, fromUserName: string, text: string) =>
    extraApi.postJson("/StoryInteract/reply", { storyId, ownerUserId, fromUserId, fromUserName, text }),
  replies: (ownerUserId: string) =>
    extraApi.get<Envelope<unknown[]>>("/StoryInteract/get-replies", { ownerUserId }),
  // Cross-device "seen" (survives across devices, not just localStorage).
  markViewed: (storyId: number, userId: string) =>
    extraApi.postJson("/StoryInteract/mark-viewed", undefined, { storyId, userId }),
  viewed: (userId: string) => extraApi.get<Envelope<number[]>>("/StoryInteract/get-viewed", { userId }),
};

// ---------- Users / search ----------
export const users = {
  search: (userName: string, pageNumber = 1, pageSize = 20) =>
    api.get<Paged<UserListItem>>("/User/get-users", {
      UserName: userName,
      PageNumber: pageNumber,
      PageSize: pageSize,
    }),
  list: (pageNumber = 1, pageSize = 20) =>
    api.get<Paged<UserListItem>>("/User/get-users", { PageNumber: pageNumber, PageSize: pageSize }),
  searchHistory: () => api.get<Envelope<unknown[]>>("/User/get-search-histories"),
  addUserSearchHistory: (userId: string) =>
    api.postJson("/User/add-user-search-history", undefined, { userProfileId: userId }),
};

// ---------- Profiles ----------
export const profiles = {
  me: () => api.get<Envelope<UserProfile>>("/UserProfile/get-my-profile"),
  byId: (id: string) => api.get<Envelope<UserProfile>>("/UserProfile/get-user-profile-by-id", { id }),
  isFollowing: (id: string) =>
    api.get<Envelope<boolean>>("/UserProfile/get-is-follow-user-profile-by-id", { id }),
  update: (about: string, gender: number) =>
    api.putJson("/UserProfile/update-user-profile", { about, gender }),
  updateImage: (imageFile: File) => {
    const form = new FormData();
    form.append("imageFile", imageFile);
    return api.putForm("/UserProfile/update-user-image-profile", form);
  },
  deleteImage: () => api.del("/UserProfile/delete-user-image-profile"),
  favorites: () => api.get<Paged<Post>>("/UserProfile/get-post-favorites"),
};

// ---------- Following ----------
export const follows = {
  subscribers: (userId: string) =>
    api.get<Envelope<UserListItem[]>>("/FollowingRelationShip/get-subscribers", { UserId: userId }),
  subscriptions: (userId: string) =>
    api.get<Envelope<UserListItem[]>>("/FollowingRelationShip/get-subscriptions", { UserId: userId }),
  follow: (followingUserId: string) =>
    api.postJson("/FollowingRelationShip/add-following-relation-ship", undefined, { followingUserId }),
  unfollow: (followingUserId: string) =>
    api.del("/FollowingRelationShip/delete-following-relation-ship", { followingUserId }),
};

// ---------- Notifications (extra backend, no JWT: userId is explicit) ----------
export const notifications = {
  list: (userId: string, pageNumber = 1, pageSize = 20) =>
    extraApi.get<Paged<AppNotification>>("/Notification/get-notifications", {
      userId,
      PageNumber: pageNumber,
      PageSize: pageSize,
    }),
  unreadCount: (userId: string) =>
    extraApi.get<Envelope<number>>("/Notification/get-unread-count", { userId }),
  markRead: (notificationId: number) =>
    extraApi.postJson("/Notification/mark-read", undefined, { notificationId }),
  markAllRead: (userId: string) =>
    extraApi.postJson("/Notification/mark-all-read", undefined, { userId }),
};

// ---------- Chat / DM ----------
export const chats = {
  all: () => api.get<Envelope<ChatListItem[]>>("/Chat/get-chats"),
  byId: (chatId: number) => api.get<Envelope<ChatMessage[]>>("/Chat/get-chat-by-id", { chatId }),
  create: (receiverUserId: string) =>
    api.postJson<Envelope<number>>("/Chat/create-chat", undefined, { receiverUserId }),
  send: (chatId: number, messageText: string, file?: File) => {
    const form = new FormData();
    form.append("ChatId", String(chatId));
    if (messageText) form.append("MessageText", messageText);
    if (file) form.append("File", file);
    return api.putForm("/Chat/send-message", form);
  },
  deleteMessage: (messageId: number) => api.del("/Chat/delete-message", { messageId }),
  deleteChat: (chatId: number) => api.del("/Chat/delete-chat", { chatId }),
};
