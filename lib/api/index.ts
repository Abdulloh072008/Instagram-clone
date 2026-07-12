/**
 * Единая точка входа в API-клиент.
 *
 * Использование (пример):
 *   import { accountApi, postApi } from "@/lib/api";
 *
 *   await accountApi.login({ userName: "vasya", password: "12345" });
 *   const posts = await postApi.getPosts({ pageNumber: 1, pageSize: 10 });
 *
 * Токен после login сохраняется автоматически, дальше все запросы уходят
 * авторизованными. Для выхода — authToken.clearToken().
 */

// Сгруппированные по контроллерам API (namespace-стиль).
export * as accountApi from "./account";
export * as userApi from "./user";
export * as userProfileApi from "./user-profile";
export * as postApi from "./post";
export * as storyApi from "./story";
export * as chatApi from "./chat";
export * as followingApi from "./following";
export * as locationApi from "./location";

// Ядро — на случай кастомных запросов и обработки ошибок.
export { request, ApiError } from "./http";
export type { ApiResponse, RequestOptions } from "./http";
export { API_BASE_URL, mediaUrl } from "./config";

// Управление токеном.
export * as authToken from "./auth-token";
export { setToken, getToken, clearToken, isAuthenticated } from "./auth-token";

// Все типы и enum-ы.
export * from "./types";
