/**
 * Типы запросов/ответов.
 *
 * Swagger не описывает подробно тела успешных ответов у большинства ручек,
 * поэтому здесь заданы известные формы запросов и разумные модели ответов.
 * Если бэкенд отдаёт больше полей — они просто не будут типизированы,
 * а сами данные всё равно придут (типы можно дополнить по факту).
 */

// ── Общее ────────────────────────────────────────────────────────────────

/** Пол. Значения по свагеру: 0 и 1. */
export enum Gender {
  Male = 0,
  Female = 1,
}

/** Параметры пагинации, встречаются во многих GET-ручках. */
export interface Pagination {
  pageNumber?: number;
  pageSize?: number;
}

// ── Account ────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  userName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

// ── User / UserProfile ──────────────────────────────────────────────────────

/** Пользователь из списка get-users (реальная форма ответа). */
export interface User {
  id: string;
  userName: string;
  fullName?: string;
  avatar?: string;
  subscribersCount?: number;
}

export interface GetUsersParams extends Pagination {
  userName?: string;
  email?: string;
}

/**
 * Профиль пользователя (get-my-profile / get-user-profile-by-id).
 * Поля по факту ответа бэка. Внимание: gender приходит СТРОКОЙ ("Male"/"Female"),
 * хотя в update-профиле он отправляется числом (см. Gender).
 */
export interface UserProfile {
  userName: string;
  firstName?: string;
  lastName?: string;
  about?: string | null;
  occupation?: string | null;
  gender?: string;
  image?: string | null;
  postCount?: number;
  subscribersCount?: number;
  subscriptionsCount?: number;
  locationId?: number;
  dob?: string;
  dateUpdated?: string;
}

export interface UpdateUserProfileRequest {
  about?: string | null;
  gender: Gender;
}

// ── Location ────────────────────────────────────────────────────────────────

export interface AddLocationRequest {
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UpdateLocationRequest extends AddLocationRequest {
  locationId: number;
}

export interface GetLocationsParams extends Pagination {
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// ── Post ────────────────────────────────────────────────────────────────────

/** Комментарий к посту. */
export interface Comment {
  postCommentId: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  dateCommented: string;
  comment: string;
}

/** Пост из ленты (реальная форма ответа get-posts / get-post-by-id). */
export interface Post {
  postId: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  datePublished: string;
  images: string[];
  title?: string;
  content?: string;
  postLike: boolean;
  postLikeCount: number;
  commentCount: number;
  comments: Comment[];
  postView: number;
  postFavorite: boolean;
  userLikes?: unknown[];
  userViews?: unknown[];
}

/** Рил (get-reels). Отличие от поста: images — одна строка (видео). */
export interface Reel {
  postId: number;
  userId: string;
  userName: string;
  userImage: string;
  datePublished: string;
  images: string; // имя видеофайла
  isSubscriber: boolean;
  postLike: boolean;
  postLikeCount: number;
  commentCount: number;
  comments: Comment[];
}

/** Краткая инфа о пользователе в списках подписчиков/подписок. */
export interface Subscriber {
  id: number;
  userShortInfo: {
    userId: string;
    userName: string;
    userPhoto: string;
    fullname: string;
  };
}

/** Локация. */
export interface Location {
  locationId: number;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/** Элемент списка чатов. */
export interface ChatSummary {
  chatId: number;
  sendUserId: string;
  sendUserName: string;
  sendUserImage: string;
  receiveUserId: string;
  receiveUserName: string;
  receiveUserImage: string;
}

/** Сообщение в чате. */
export interface ChatMessage {
  messageId: number;
  chatId: number;
  userId: string;
  userName: string;
  userImage: string;
  messageText: string;
  sendMassageDate: string;
  file: string | null;
}

export interface GetPostsParams extends Pagination {
  userId?: string;
  title?: string;
  content?: string;
}

export interface AddPostRequest {
  title?: string;
  content?: string;
  images: File[]; // обязательное поле по свагеру
}

export interface AddCommentRequest {
  comment: string;
  postId: number;
}

export interface AddPostFavoriteRequest {
  postId: number;
}

// ── Chat ────────────────────────────────────────────────────────────────────

export interface SendMessageRequest {
  chatId: number;
  messageText?: string;
  file?: File;
}
