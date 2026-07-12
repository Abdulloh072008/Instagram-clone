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

/**
 * Сторис в ленте сгруппированы по пользователю.
 * Внимание: get-stories / get-user-stories / get-my-stories возвращают
 * ГОЛЫЙ массив (без конверта ApiResponse).
 */
export interface StoryGroup {
  userId: string;
  userName: string;
  userImage: string;
  stories: unknown[];
}

/** Лента сторис (тех, на кого подписан). Возвращает массив напрямую. */
export function getStories() {
  return request<StoryGroup[]>("/Story/get-stories");
}

/** Сторис конкретного пользователя. Возвращает массив напрямую. */
export function getUserStories(userId: string) {
  return request<StoryGroup[]>(`/Story/get-user-stories/${encodeURIComponent(userId)}`);
}

/** Мои сторис. Возвращает массив напрямую. */
export function getMyStories() {
  return request<StoryGroup[]>("/Story/get-my-stories");
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
