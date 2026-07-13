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

export interface StoryItem {
  storyId?: number;
  id?: number;
  fileName?: string;
  image?: string;
  createAt?: string;
  dateCreated?: string;
  storyView?: number;
  storyLike?: boolean;
  [key: string]: unknown;
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

/** Decoded fields we care about from the JWT payload. */
export interface AuthUser {
  id: string; // sid claim
  userName: string; // name claim
  email: string;
  role: string;
}
