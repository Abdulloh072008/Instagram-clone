// Typed wrappers around every backend endpoint the UI uses.
import { api, extraApi } from "./client";
import type {
  AppNotification,
  AuthUser,
  CallInfo,
  CallSignal,
  CallType,
  ChatListItem,
  ChatMessage,
  Envelope,
  ExtraMessage,
  FollowListItem,
  GifItem,
  MessageReactions,
  Paged,
  Post,
  Repost,
  RepostState,
  StoryReactions,
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

// ---------- Privacy + follow requests (extra backend) ----------
export interface FollowRequestDto {
  id: number; requesterId: string; requesterName: string; requesterImage: string | null;
  targetId: string; status: string; createdAt: string;
}
export const privacy = {
  get: (userId: string) => extraApi.get<Envelope<{ userId: string; isPrivate: boolean }>>("/Privacy/get", { userId }),
  set: (userId: string, isPrivate: boolean) =>
    extraApi.putJson<Envelope<{ userId: string; isPrivate: boolean }>>("/Privacy/set", undefined, { userId, isPrivate }),
};
export const followRequests = {
  create: (requesterId: string, requesterName: string, requesterImage: string | null, targetId: string) =>
    extraApi.postJson<Envelope<FollowRequestDto>>("/FollowRequest/create", { requesterId, requesterName, requesterImage, targetId }),
  incoming: (userId: string) => extraApi.get<Envelope<FollowRequestDto[]>>("/FollowRequest/incoming", { userId }),
  status: (requesterId: string, targetId: string) => extraApi.get<Envelope<string>>("/FollowRequest/status", { requesterId, targetId }),
  approve: (id: number) => extraApi.putJson("/FollowRequest/approve", undefined, { id }),
  decline: (id: number) => extraApi.del("/FollowRequest/decline", { id }),
  cancel: (requesterId: string, targetId: string) => extraApi.del("/FollowRequest/cancel", { requesterId, targetId }),
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

// ---------- Presence / online status (extra backend) ----------
export interface PresenceDto { userId: string; online: boolean; lastSeenAt: string }
export const presence = {
  // «Я онлайн» — шлём каждые ~30с, пока приложение открыто.
  heartbeat: (userId: string) => extraApi.postJson("/Presence/heartbeat", undefined, { userId }),
  // Статусы собеседников (id через запятую).
  status: (userIds: string[]) =>
    extraApi.get<Envelope<PresenceDto[]>>("/Presence/status", { userIds: userIds.join(",") }),
};

// ---------- Time Capsule (extra backend) — posts hidden until a reveal date ----------
export interface CapsuleDto { postId: number; userId: string; revealAt: string; locked: boolean }
export const timeCapsule = {
  set: (postId: number, userId: string, revealAt: string) =>
    extraApi.postJson<Envelope<CapsuleDto>>("/TimeCapsule/set", { postId, userId, revealAt }),
  remove: (postId: number) => extraApi.del("/TimeCapsule/remove", { postId }),
  all: () => extraApi.get<Envelope<CapsuleDto[]>>("/TimeCapsule/all"),
};

// ---------- Profile music (extra backend) — pin a track others can play ----------
export interface TrackDto { trackName: string; artistName: string; previewUrl: string; artworkUrl: string }
export interface ProfileMusicDto extends TrackDto { userId: string }
export const music = {
  search: (q: string) => extraApi.get<Envelope<TrackDto[]>>("/Music/search", { q }),
  get: (userId: string) => extraApi.get<Envelope<ProfileMusicDto | null>>("/Music/get", { userId }),
  set: (userId: string, t: TrackDto) =>
    extraApi.postJson<Envelope<ProfileMusicDto>>("/Music/set", { userId, ...t }),
  remove: (userId: string) => extraApi.del("/Music/remove", { userId }),
};

// ---------- Stories (extra backend: /StoryExtra + /StoryInteract) ----------
// The main API's /Story controller is no longer used: the extra backend owns
// stories now and serves reactions/replies the main one never had. No JWT here,
// so the caller's id/name travel explicitly on every write.
export const stories = {
  all: () => extraApi.get<Envelope<UserStories[]>>("/StoryExtra/feed").then((r) => r.data ?? []),

  add: (me: AuthUser, file: File, caption = "") => {
    const form = new FormData();
    form.append("UserId", me.id);
    form.append("UserName", me.userName);
    if (me.image) form.append("UserImage", me.image);
    form.append("Caption", caption);
    form.append("File", file);
    return extraApi.postForm("/StoryExtra/add", form);
  },

  view: (storyId: number, me: AuthUser) =>
    extraApi.postJson("/StoryExtra/view", undefined, {
      storyId,
      userId: me.id,
      userName: me.userName,
    }),

  like: (storyId: number, me: AuthUser) =>
    extraApi.postJson("/StoryExtra/like", undefined, {
      storyId,
      userId: me.id,
      userName: me.userName,
    }),

  remove: (id: number) => extraApi.del("/StoryExtra/delete", { id }),

  reactions: (storyId: number, userId?: string) =>
    extraApi.get<Envelope<StoryReactions>>("/StoryInteract/get-reactions", { storyId, userId }),

  react: (storyId: number, me: AuthUser, emoji: string) =>
    extraApi.postJson("/StoryInteract/react", {
      storyId,
      userId: me.id,
      userName: me.userName,
      emoji,
    }),

  unreact: (storyId: number, userId: string) =>
    extraApi.del("/StoryInteract/remove-reaction", { storyId, userId }),

  reply: (storyId: number, ownerUserId: string, me: AuthUser, text: string) =>
    extraApi.postJson("/StoryInteract/reply", {
      storyId,
      ownerUserId,
      fromUserId: me.id,
      fromUserName: me.userName,
      text,
    }),

  // Мои сторис (главный API /Story) — для выбора кадров в Highlights.
  mine: () => api.get<UserStories[]>("/Story/get-my-stories"),
  // Кросс-девайс «просмотрено» (доп-бэк): StoriesBar подмешивает к локальному seen.
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
  // Two traps here, both verified against the live API:
  //  - the query param is `followingUserId`, not `id`; sending `id` gets a 404,
  //  - despite the name it answers with the target's PROFILE carrying an
  //    `isSubscriber` flag, not a bare boolean. `Boolean(envelope.data)` is
  //    therefore always true, which marks every account as already followed.
  // Unwrap to a real yes/no here so no caller can repeat either mistake.
  isFollowing: (followingUserId: string) =>
    api
      .get<Envelope<{ isSubscriber?: boolean } | null>>(
        "/UserProfile/get-is-follow-user-profile-by-id",
        { followingUserId },
      )
      .then((r) => r.data?.isSubscriber === true),
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
    api.get<Envelope<FollowListItem[]>>("/FollowingRelationShip/get-subscribers", {
      UserId: userId,
    }),
  subscriptions: (userId: string) =>
    api.get<Envelope<FollowListItem[]>>("/FollowingRelationShip/get-subscriptions", {
      UserId: userId,
    }),
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
  // The backend misspells the query param as `massageId`; sending `messageId`
  // is silently ignored and nothing gets deleted. Verified against the live spec.
  deleteMessage: (messageId: number) => api.del("/Chat/delete-message", { massageId: messageId }),
  deleteChat: (chatId: number) => api.del("/Chat/delete-chat", { chatId }),
};

// ---------- Rich messages (extra backend, no JWT: sender is explicit) ----------
// A parallel per-chat store keyed by the same chatId. Holds what main /Chat
// can't: gif/voice/sticker, plus "seen" read-receipt markers. Only this client
// sees these — the main API and other clients never do.
export const chatExtra = {
  get: (chatId: number, type?: string) =>
    extraApi.get<Envelope<ExtraMessage[]>>("/ChatExtra/get", { chatId, type }),

  // JSON send for anything whose media is already a URL (gif, sticker).
  send: (chatId: number, me: AuthUser, kind: string, opts: { text?: string; mediaUrl?: string }) =>
    extraApi.postJson<Envelope<ExtraMessage>>("/ChatExtra/send", {
      chatId,
      senderId: me.id,
      senderName: me.userName,
      type: kind,
      text: opts.text ?? null,
      mediaUrl: opts.mediaUrl ?? null,
      fileName: null,
    }),

  // Multipart send for a recorded blob (voice notes).
  sendFile: (chatId: number, me: AuthUser, kind: string, file: File, durationSec?: number, text?: string) => {
    const form = new FormData();
    form.append("ChatId", String(chatId));
    form.append("SenderId", me.id);
    form.append("SenderName", me.userName);
    form.append("Type", kind);
    form.append("File", file);
    if (durationSec != null) form.append("DurationSec", String(Math.round(durationSec)));
    if (text) form.append("Text", text);
    return extraApi.postForm<Envelope<ExtraMessage>>("/ChatExtra/send-file", form);
  },

  remove: (id: number) => extraApi.del("/ChatExtra/delete", { id }),
};

// ---------- Message reactions (extra backend) ----------
// Keyed by a messageId that spans both stores via reactionKey() — see lib/chat.
export const messageReactions = {
  get: (messageId: number, userId?: string) =>
    extraApi.get<Envelope<MessageReactions>>("/MessageReaction/get", { messageId, userId }),
  add: (messageId: number, me: AuthUser, emoji: string) =>
    extraApi.postJson("/MessageReaction/add", {
      messageId,
      userId: me.id,
      userName: me.userName,
      emoji,
    }),
  remove: (messageId: number, userId: string) =>
    extraApi.del("/MessageReaction/remove", { messageId, userId }),
};

// ---------- GIFs & stickers (extra backend) ----------
export const gifs = {
  trending: (limit = 24) => extraApi.get<Envelope<GifItem[]>>("/Gif/trending", { limit }),
  search: (q: string, limit = 24, offset = 0) =>
    extraApi.get<Envelope<GifItem[]>>("/Gif/search", { q, limit, offset }),
};

// In this backend a "sticker" is a big emoji: `url` is the emoji glyph itself,
// not an image address. MessageBubble renders it as large text accordingly.
export const stickers = {
  packs: () => extraApi.get<Envelope<string[]>>("/Sticker/packs"),
  get: (pack: string) =>
    extraApi.get<Envelope<{ id: number; pack: string; name: string; url: string }[]>>("/Sticker/get", { pack }),
};

// ---------- Calls (extra backend) ----------
// State + WebRTC signaling. Media is negotiated over send-signal/get-signals;
// the API never touches audio/video itself.
export const calls = {
  start: (me: AuthUser, callee: { id: string; name: string }, type: CallType) =>
    extraApi.postJson<Envelope<CallInfo>>("/Call/start", {
      callerId: me.id,
      callerName: me.userName,
      calleeId: callee.id,
      calleeName: callee.name,
      type,
    }),
  incoming: (userId: string) => extraApi.get<Envelope<CallInfo[]>>("/Call/incoming", { userId }),
  get: (callId: number) => extraApi.get<Envelope<CallInfo>>("/Call/get", { callId }),
  history: (userId: string) => extraApi.get<Envelope<CallInfo[]>>("/Call/history", { userId }),
  accept: (callId: number) => extraApi.put<Envelope<CallInfo>>("/Call/accept", { callId }),
  decline: (callId: number) => extraApi.put<Envelope<CallInfo>>("/Call/decline", { callId }),
  end: (callId: number) => extraApi.put<Envelope<CallInfo>>("/Call/end", { callId }),
  sendSignal: (callId: number, fromUserId: string, kind: string, payload: string) =>
    extraApi.postJson<Envelope<CallSignal>>("/Call/send-signal", { callId, fromUserId, kind, payload }),
  getSignals: (callId: number, userId: string, sinceId: number) =>
    extraApi.get<Envelope<CallSignal[]>>("/Call/get-signals", { callId, userId, sinceId }),
};
