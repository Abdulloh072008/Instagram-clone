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

export interface User {
  id: string;
  userName: string;
  fullName?: string;
  email?: string;
  userPhoto?: string | null;
}

export interface GetUsersParams extends Pagination {
  userName?: string;
  email?: string;
}

export interface UserProfile {
  userId: string;
  userName: string;
  fullName?: string;
  about?: string | null;
  gender?: Gender;
  image?: string | null;
  postCount?: number;
  subscribersCount?: number;
  subscriptionsCount?: number;
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
