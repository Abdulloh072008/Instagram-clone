// Typed wrappers around every backend endpoint the UI uses.
import { api, extraApi } from "./client";
import type {
  AppNotification,
  AuthUser,
  ChatListItem,
  ChatMessage,
  Envelope,
  FollowListItem,
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
  deleteMessage: (messageId: number) => api.del("/Chat/delete-message", { messageId }),
  deleteChat: (chatId: number) => api.del("/Chat/delete-chat", { chatId }),
};
