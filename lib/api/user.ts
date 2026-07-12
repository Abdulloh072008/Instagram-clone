import { request, ApiResponse, PagedResponse } from "./http";
import type { GetUsersParams, User } from "./types";

/**
 * /User — поиск пользователей и история поиска.
 */

/** Поиск/список пользователей (с пагинацией). */
export function getUsers(params: GetUsersParams = {}) {
  return request<PagedResponse<User>>("/User/get-users", {
    query: {
      UserName: params.userName,
      Email: params.email,
      PageNumber: params.pageNumber,
      PageSize: params.pageSize,
    },
  });
}

/** Добавить текстовый запрос в историю поиска. */
export function addSearchHistory(text: string) {
  return request<ApiResponse<unknown>>("/User/add-search-history", {
    method: "POST",
    query: { Text: text },
  });
}

/** Получить историю текстового поиска. */
export function getSearchHistories() {
  return request<ApiResponse<unknown>>("/User/get-search-histories");
}

/** Удалить одну запись из истории текстового поиска. */
export function deleteSearchHistory(id: number) {
  return request<ApiResponse<unknown>>("/User/delete-search-history", {
    method: "DELETE",
    query: { id },
  });
}

/** Очистить всю историю текстового поиска. */
export function deleteSearchHistories() {
  return request<ApiResponse<unknown>>("/User/delete-search-histories", { method: "DELETE" });
}

/** Добавить пользователя в историю поиска (кого искали). */
export function addUserSearchHistory(userSearchId: string) {
  return request<ApiResponse<unknown>>("/User/add-user-search-history", {
    method: "POST",
    query: { UserSearchId: userSearchId },
  });
}

/** История поиска пользователей. */
export function getUserSearchHistories() {
  return request<ApiResponse<unknown>>("/User/get-user-search-histories");
}

/** Удалить одну запись из истории поиска пользователей. */
export function deleteUserSearchHistory(id: number) {
  return request<ApiResponse<unknown>>("/User/delete-user-search-history", {
    method: "DELETE",
    query: { id },
  });
}

/** Очистить историю поиска пользователей. */
export function deleteUserSearchHistories() {
  return request<ApiResponse<unknown>>("/User/delete-user-search-histories", { method: "DELETE" });
}

/** Удалить пользователя. */
export function deleteUser(userId: string) {
  return request<ApiResponse<unknown>>("/User/delete-user", {
    method: "DELETE",
    query: { userId },
  });
}
