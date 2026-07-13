import { request, ApiResponse } from "./http";
import { EXTRA_API_BASE_URL } from "./config";

/**
 * /Reaction — эмодзи-реакции на посты. Живут в дополнительном бэкенде
 * (InstagramExtraApi). userId/имя передаём явно (авторизации там нет).
 */

export interface ReactionSummaryItem {
  emoji: string;
  count: number;
}

export interface PostReactions {
  total: number;
  summary: ReactionSummaryItem[];
  mine: string | null;
  reactions: { id: number; userId: string; userName: string; postId: number; emoji: string; createdAt: string }[];
}

const extra = { baseUrl: EXTRA_API_BASE_URL, auth: false as const };

/** Поставить/сменить реакцию на пост. */
export function addReaction(payload: { userId: string; userName: string; postId: number; emoji: string }) {
  return request<ApiResponse<boolean>>("/Reaction/add", { ...extra, method: "POST", json: payload });
}

/** Убрать свою реакцию. */
export function removeReaction(userId: string, postId: number) {
  return request<ApiResponse<boolean>>("/Reaction/remove", { ...extra, method: "DELETE", query: { userId, postId } });
}

/** Реакции поста: сводка по эмодзи + моя реакция. */
export function getReactions(postId: number, userId?: string) {
  return request<ApiResponse<PostReactions>>("/Reaction/get", { ...extra, query: { postId, userId } });
}
