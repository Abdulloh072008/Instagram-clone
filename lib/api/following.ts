import { request, ApiResponse } from "./http";
import type { Subscriber } from "./types";

/**
 * /FollowingRelationShip — подписки и подписчики.
 */

/** Подписчики пользователя. */
export function getSubscribers(userId: string) {
  return request<ApiResponse<Subscriber[]>>("/FollowingRelationShip/get-subscribers", {
    query: { UserId: userId },
  });
}

/** Подписки пользователя. */
export function getSubscriptions(userId: string) {
  return request<ApiResponse<Subscriber[]>>("/FollowingRelationShip/get-subscriptions", {
    query: { UserId: userId },
  });
}

/** Подписаться на пользователя. */
export function follow(followingUserId: string) {
  return request<ApiResponse<unknown>>(
    "/FollowingRelationShip/add-following-relation-ship",
    { method: "POST", query: { followingUserId } },
  );
}

/** Отписаться от пользователя. */
export function unfollow(followingUserId: string) {
  return request<ApiResponse<unknown>>(
    "/FollowingRelationShip/delete-following-relation-ship",
    { method: "DELETE", query: { followingUserId } },
  );
}
