import { request, ApiResponse } from "./http";
import type { SendMessageRequest, ChatSummary, ChatMessage } from "./types";

/**
 * /Chat — чаты и сообщения.
 */

/** Список моих чатов. */
export function getChats() {
  return request<ApiResponse<ChatSummary[]>>("/Chat/get-chats");
}

/** Чат по id — возвращает массив сообщений. */
export function getChatById(chatId: number) {
  return request<ApiResponse<ChatMessage[]>>("/Chat/get-chat-by-id", { query: { chatId } });
}

/** Создать чат с пользователем. */
export function createChat(receiverUserId: string) {
  return request<ApiResponse<unknown>>("/Chat/create-chat", {
    method: "POST",
    query: { receiverUserId },
  });
}

/** Отправить сообщение (текст и/или файл, multipart). */
export function sendMessage(payload: SendMessageRequest) {
  const form = new FormData();
  form.append("ChatId", String(payload.chatId));
  if (payload.messageText) form.append("MessageText", payload.messageText);
  if (payload.file) form.append("File", payload.file);
  return request<ApiResponse<unknown>>("/Chat/send-message", { method: "PUT", formData: form });
}

/** Удалить сообщение. (в свагере параметр называется massageId) */
export function deleteMessage(messageId: number) {
  return request<ApiResponse<unknown>>("/Chat/delete-message", {
    method: "DELETE",
    query: { massageId: messageId },
  });
}

/** Удалить чат. */
export function deleteChat(chatId: number) {
  return request<ApiResponse<unknown>>("/Chat/delete-chat", {
    method: "DELETE",
    query: { chatId },
  });
}
