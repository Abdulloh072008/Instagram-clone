import { request, ApiResponse, PagedResponse } from "./http";
import type { UserProfile, UpdateUserProfileRequest, Pagination, Post } from "./types";

/**
 * /UserProfile — профиль пользователя, аватар, избранное.
 */

/** Профиль пользователя по id. */
export function getUserProfileById(id: string) {
  return request<ApiResponse<UserProfile>>("/UserProfile/get-user-profile-by-id", {
    query: { id },
  });
}

/** Подписан ли я на этого пользователя. */
export function getIsFollowUserProfileById(followingUserId: string) {
  return request<ApiResponse<boolean>>("/UserProfile/get-is-follow-user-profile-by-id", {
    query: { followingUserId },
  });
}

/** Мой профиль. */
export function getMyProfile() {
  return request<ApiResponse<UserProfile>>("/UserProfile/get-my-profile");
}

/** Обновить профиль (о себе + пол). */
export function updateUserProfile(payload: UpdateUserProfileRequest) {
  return request<ApiResponse<unknown>>("/UserProfile/update-user-profile", {
    method: "PUT",
    json: payload,
  });
}

/** Мои избранные посты. */
export function getPostFavorites(params: Pagination = {}) {
  return request<PagedResponse<Post>>("/UserProfile/get-post-favorites", {
    query: { PageNumber: params.pageNumber, PageSize: params.pageSize },
  });
}

/** Обновить аватар (multipart). */
export function updateUserImageProfile(imageFile: File) {
  const form = new FormData();
  form.append("imageFile", imageFile);
  return request<ApiResponse<unknown>>("/UserProfile/update-user-image-profile", {
    method: "PUT",
    formData: form,
  });
}

/** Удалить аватар. */
export function deleteUserImageProfile() {
  return request<ApiResponse<unknown>>("/UserProfile/delete-user-image-profile", {
    method: "DELETE",
  });
}
