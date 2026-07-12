import { request, ApiResponse, PagedResponse } from "./http";
import type {
  GetPostsParams,
  AddPostRequest,
  AddCommentRequest,
  AddPostFavoriteRequest,
  Post,
  Pagination,
} from "./types";

/**
 * /Post — посты, рилсы, лайки, комментарии, избранное.
 */

/** Лента постов с фильтрами и пагинацией. */
export function getPosts(params: GetPostsParams = {}) {
  return request<PagedResponse<Post>>("/Post/get-posts", {
    query: {
      UserId: params.userId,
      Title: params.title,
      Content: params.content,
      PageNumber: params.pageNumber,
      PageSize: params.pageSize,
    },
  });
}

/** Рилсы (видео-лента). */
export function getReels(params: Pagination = {}) {
  return request<PagedResponse<Post>>("/Post/get-reels", {
    query: { PageNumber: params.pageNumber, PageSize: params.pageSize },
  });
}

/** Один пост по id. */
export function getPostById(id: number) {
  return request<ApiResponse<unknown>>("/Post/get-post-by-id", { query: { id } });
}

/** Мои посты. */
export function getMyPosts() {
  return request<ApiResponse<unknown>>("/Post/get-my-posts");
}

/** Посты пользователей, на которых я подписан. */
export function getFollowingPosts(params: { userId?: string } & Pagination = {}) {
  return request<PagedResponse<Post>>("/Post/get-following-post", {
    query: {
      UserId: params.userId,
      PageNumber: params.pageNumber,
      PageSize: params.pageSize,
    },
  });
}

/** Создать пост с картинками (multipart/form-data). */
export function addPost(payload: AddPostRequest) {
  const form = new FormData();
  if (payload.title) form.append("Title", payload.title);
  if (payload.content) form.append("Content", payload.content);
  for (const image of payload.images) {
    form.append("Images", image);
  }
  return request<ApiResponse<unknown>>("/Post/add-post", { method: "POST", formData: form });
}

/** Удалить пост. */
export function deletePost(id: number) {
  return request<ApiResponse<unknown>>("/Post/delete-post", { method: "DELETE", query: { id } });
}

/** Поставить/снять лайк. */
export function likePost(postId: number) {
  return request<ApiResponse<unknown>>("/Post/like-post", { method: "POST", query: { postId } });
}

/** Засчитать просмотр поста. */
export function viewPost(postId: number) {
  return request<ApiResponse<unknown>>("/Post/view-post", { method: "POST", query: { postId } });
}

/** Добавить комментарий. */
export function addComment(payload: AddCommentRequest) {
  return request<ApiResponse<unknown>>("/Post/add-comment", { method: "POST", json: payload });
}

/** Удалить комментарий. */
export function deleteComment(commentId: number) {
  return request<ApiResponse<unknown>>("/Post/delete-comment", {
    method: "DELETE",
    query: { commentId },
  });
}

/** Добавить пост в избранное. */
export function addPostFavorite(payload: AddPostFavoriteRequest) {
  return request<ApiResponse<unknown>>("/Post/add-post-favorite", {
    method: "POST",
    json: payload,
  });
}
