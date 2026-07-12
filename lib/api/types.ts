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

/** Пост из ленты (реальная форма ответа get-posts). */
export interface Post {
  postId: number;
  userId: string;
  userName: string;
  userImage: string;
  datePublished: string;
  images: string[];
  title: string;
  content: string;
  postLike: boolean;
  postLikeCount: number;
  commentCount: number;
  comments: unknown[];
  postView: number;
  postFavorite: boolean;
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
