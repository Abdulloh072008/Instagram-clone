import { request, ApiResponse } from "./http";
import { EXTRA_API_BASE_URL } from "./config";

/**
 * /Call — аудио/видео звонки. Ручки живут в дополнительном бэкенде
 * (InstagramExtraApi), в основном API их нет. Авторизации там нет, поэтому
 * userId/имя передаём явно.
 */

export type CallType = "video" | "audio";
export type CallStatus = "ringing" | "accepted" | "declined" | "ended" | "missed";

export interface Call {
  id: number;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: CallType;
  status: CallStatus;
  createdAt: string;
  endedAt: string | null;
}

const extra = { baseUrl: EXTRA_API_BASE_URL, auth: false as const };

export interface StartCallPayload {
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: CallType;
}

/** Начать звонок (создаётся в статусе ringing). */
export function startCall(payload: StartCallPayload) {
  return request<ApiResponse<Call>>("/Call/start", { ...extra, method: "POST", json: payload });
}

/** Входящие звонки для пользователя (статус ringing). */
export function getIncomingCalls(userId: string) {
  return request<ApiResponse<Call[]>>("/Call/incoming", { ...extra, query: { userId } });
}

/** Один звонок по id (для опроса статуса). */
export function getCall(callId: number) {
  return request<ApiResponse<Call>>("/Call/get", { ...extra, query: { callId } });
}

/** История звонков. */
export function getCallHistory(userId: string) {
  return request<ApiResponse<Call[]>>("/Call/history", { ...extra, query: { userId } });
}

export function acceptCall(callId: number) {
  return request<ApiResponse<Call>>("/Call/accept", { ...extra, method: "PUT", query: { callId } });
}

export function declineCall(callId: number) {
  return request<ApiResponse<Call>>("/Call/decline", { ...extra, method: "PUT", query: { callId } });
}

export function endCall(callId: number) {
  return request<ApiResponse<Call>>("/Call/end", { ...extra, method: "PUT", query: { callId } });
}
