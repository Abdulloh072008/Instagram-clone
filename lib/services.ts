// Typed wrappers around every backend endpoint the UI uses.
import { api, extraApi } from "./client";
import type {
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

  reels: (pageNumber = 1, pageSize = 10) =>
    api.get<Paged<Post>>("/Post/get-reels", { PageNumber: pageNumber, PageSize: pageSize }),

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

  remove: (postId: number) => api.del("/Post/delete-post", { postId }),
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

// ---------- Stories ----------
export const stories = {
  all: () => api.get<UserStories[]>("/Story/get-stories"),
  mine: () => api.get<UserStories[]>("/Story/get-my-stories"),
  byUser: (userId: string) => api.get<UserStories>(`/Story/get-user-stories/${userId}`),
  like: (storyId: number) => api.postJson("/Story/LikeStory", undefined, { storyId }),
  view: (storyId: number) => api.postJson("/Story/add-story-view", undefined, { storyId }),
  add: (postId: number, image: File) => {
    const form = new FormData();
    form.append("Image", image);
    return api.postForm("/Story/AddStories", form, { PostId: postId });
  },
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
