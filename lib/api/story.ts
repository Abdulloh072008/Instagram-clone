import { request, ApiResponse } from "./http";

/**
 * /Story — сторис: лента, просмотры, лайки.
 */

export interface StoryViewerDto {
  userName: string;
  name: string;
  viewCount: number;
  viewLike: number;
}

export interface Story {
  id: number;
  fileName: string;
  postId: number;
  createAt: string;
  userId: string;
  userAvatar: string;
  viewerDto?: StoryViewerDto;
}

/** Лента сторис (тех, на кого подписан). */
export function getStories() {
  return request<ApiResponse<Story[]>>("/Story/get-stories");
}

/** Сторис конкретного пользователя. */
export function getUserStories(userId: string) {
  return request<ApiResponse<Story[]>>(`/Story/get-user-stories/${encodeURIComponent(userId)}`);
}

/** Мои сторис. */
export function getMyStories() {
  return request<ApiResponse<Story[]>>("/Story/get-my-stories");
}

/** Одна сторис по id. */
export function getStoryById(id: number) {
  return request<ApiResponse<Story>>("/Story/GetStoryById", { query: { id } });
}

/** Лайкнуть сторис. */
export function likeStory(storyId: number) {
  return request<ApiResponse<string>>("/Story/LikeStory", { method: "POST", query: { storyId } });
}

/** Добавить сторис (картинка, multipart). PostId опционален. */
export function addStory(image: File, postId?: number) {
  const form = new FormData();
  form.append("Image", image);
  return request<ApiResponse<string>>("/Story/AddStories", {
    method: "POST",
    query: { PostId: postId },
    formData: form,
  });
}

/** Удалить сторис. */
export function deleteStory(id: number) {
  return request<ApiResponse<boolean>>("/Story/DeleteStory", { method: "DELETE", query: { id } });
}

/** Засчитать просмотр сторис. */
export function addStoryView(storyId: number) {
  return request<ApiResponse<{ id: number; viewUserId: string; storyId: number }>>(
    "/Story/add-story-view",
    { method: "POST", query: { StoryId: storyId } },
  );
}
