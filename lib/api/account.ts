import { request, ApiResponse } from "./http";
import { setToken } from "./auth-token";
import type { RegisterRequest, LoginRequest } from "./types";

/**
 * /Account — регистрация, вход и работа с паролем.
 */

/** Регистрация нового пользователя. */
export function register(payload: RegisterRequest) {
  return request<ApiResponse<string>>("/Account/register", {
    method: "POST",
    json: payload,
    auth: false,
  });
}

/**
 * Вход. При успехе автоматически сохраняет полученный JWT-токен,
 * после чего все остальные запросы уходят уже авторизованными.
 *
 * Бэкенд может вернуть токен строкой в `data` либо объектом с полем token —
 * поддерживаем оба варианта.
 */
export async function login(payload: LoginRequest) {
  const res = await request<ApiResponse<string | { token?: string }>>("/Account/login", {
    method: "POST",
    json: payload,
    auth: false,
  });

  const token =
    typeof res.data === "string" ? res.data : (res.data?.token ?? null);
  if (token) setToken(token);

  return res;
}

/** Запрос на восстановление пароля — на email придёт токен сброса. */
export function forgotPassword(email: string) {
  return request<ApiResponse<string>>("/Account/ForgotPassword", {
    method: "DELETE",
    query: { Email: email },
    auth: false,
  });
}

/** Сброс пароля по токену из письма. */
export function resetPassword(params: {
  token: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  return request<ApiResponse<string>>("/Account/ResetPassword", {
    method: "DELETE",
    query: {
      Token: params.token,
      Email: params.email,
      Password: params.password,
      ConfirmPassword: params.confirmPassword,
    },
    auth: false,
  });
}

/** Смена пароля авторизованным пользователем. */
export function changePassword(params: {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}) {
  return request<ApiResponse<string>>("/Account/ChangePassword", {
    method: "PUT",
    query: {
      OldPassword: params.oldPassword,
      Password: params.password,
      ConfirmPassword: params.confirmPassword,
    },
  });
}
