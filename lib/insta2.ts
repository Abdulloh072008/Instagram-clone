"use client";

// Client for the rich social backend (backend-insta-jma5, FastAPI, /api).
// It has its OWN JWT auth and numeric user ids, separate from the softclub API.
// We keep the softclub session as the app's primary identity and transparently
// mirror it here (register-or-login with the same credentials) so the new
// features (chat, notifications, reactions, recommendations) work — hybrid mode.

import { INSTA2_BASE } from "./config";

const TOKEN_KEY = "ig2_token";
const UID_KEY = "ig2_uid";

export function getInsta2Token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function getInsta2Uid(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(UID_KEY);
  return v ? Number(v) : null;
}
function setSession(token: string, uid: number) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(UID_KEY, String(uid));
}
export function clearInsta2() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(UID_KEY);
}

async function req<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = getInsta2Token();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(INSTA2_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error || json?.message || res.statusText);
  return json as T;
}

interface AuthResp {
  token: string;
  user: { id: number; username: string };
}

/**
 * Ensure a session on the new backend using the softclub credentials.
 * Tries login first, registers on failure. Best-effort — never throws.
 */
export async function ensureInsta2Session(
  username: string,
  password: string,
  email: string,
  fullName: string,
): Promise<void> {
  try {
    const r = await req<AuthResp>("/auth/login", {
      method: "POST",
      body: { login: username, password },
      auth: false,
    });
    setSession(r.token, r.user.id);
    return;
  } catch {
    /* not registered yet — try to register */
  }
  try {
    const r = await req<AuthResp>("/auth/register", {
      method: "POST",
      body: { username, email: email || `${username}@example.com`, password, fullName: fullName || username },
      auth: false,
    });
    setSession(r.token, r.user.id);
  } catch {
    /* give up silently; new-backend features will no-op */
  }
}

// ---------- Types (new backend shapes) ----------
export type Emoji = "👍" | "❤️" | "😂" | "😮" | "😢" | "😡";
export const REACTIONS: Emoji[] = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export interface I2User {
  id: number;
  username: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  followers?: number;
  mutualFollowers?: number;
  reason?: string;
}

export interface I2Message {
  id: number;
  senderId?: number;
  conversationId?: number;
  text?: string | null;
  voiceUrl?: string | null;
  voiceSecs?: number | null;
  edited?: boolean;
  editedAt?: string | null;
  deleted?: boolean;
  seenAt?: string | null;
  status?: string;
  reactions?: Record<string, number[]>; // emoji -> [userId]
  createdAt?: string;
  [k: string]: unknown;
}

export interface I2ConversationDetail {
  conversationId: number;
  user: I2User;
  messages: I2Message[];
}

export interface I2Conversation {
  id?: number;
  user?: I2User; // the other participant
  lastMessage?: I2Message | null;
  unread?: number;
  [k: string]: unknown;
}

export interface I2Notification {
  id: number;
  type: string; // "like" | "follow" | "comment" | ...
  actor?: I2User;
  text?: string;
  postId?: number;
  isRead?: boolean;
  createdAt?: string;
  [k: string]: unknown;
}

// ---------- Services ----------
export const insta2 = {
  me: () => req<I2User>("/users/me"),

  notifications: {
    list: () => req<{ notifications?: I2Notification[] } | I2Notification[]>("/notifications"),
    unreadCount: () => req<{ unread: number }>("/notifications/unread-count"),
    markAll: () => req("/notifications/read", { method: "POST" }),
    markRead: (id: number) => req(`/notifications/${id}/read`, { method: "POST" }),
  },

  recommendations: {
    users: () => req<{ users: I2User[] }>("/recommendations/users"),
    posts: () => req<{ posts: unknown[] }>("/recommendations/posts"),
  },

  chat: {
    conversations: () => req<{ conversations: I2Conversation[] }>("/conversations"),
    // GET returns the conversation with its messages.
    with: (userId: number) => req<I2ConversationDetail>(`/conversations/with/${userId}`),
    send: (userId: number, text: string) =>
      req<I2Message>(`/conversations/with/${userId}/messages`, { method: "POST", body: { text } }),
    sendVoice: (userId: number, voice: string, voiceSecs: number) =>
      req<I2Message>(`/conversations/with/${userId}/messages`, {
        method: "POST",
        body: { voice, voiceSecs },
      }),
    editMessage: (id: number, text: string) =>
      req<I2Message>(`/messages/${id}`, { method: "PATCH", body: { text } }),
    deleteMessage: (id: number) => req(`/messages/${id}`, { method: "DELETE" }),
    reactMessage: (id: number, emoji: Emoji) =>
      req(`/messages/${id}/reaction`, { method: "PUT", body: { emoji } }),
  },

  comments: {
    list: (postId: number) => req<{ comments?: unknown[] } | unknown[]>(`/posts/${postId}/comments`),
    add: (postId: number, text: string) =>
      req(`/posts/${postId}/comments`, { method: "POST", body: { text } }),
    react: (commentId: number, emoji: Emoji) =>
      req(`/comments/${commentId}/reaction`, { method: "PUT", body: { emoji } }),
    remove: (commentId: number) => req(`/comments/${commentId}`, { method: "DELETE" }),
  },

  users: {
    byId: (id: number) => req<I2User>(`/users/${id}`),
    follow: (id: number) => req(`/users/${id}/follow`, { method: "POST" }),
  },
};
