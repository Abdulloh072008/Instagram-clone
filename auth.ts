import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Конфигурация Auth.js (NextAuth v5). Пока — только вход через Google.
 *
 * Читает из окружения:
 *   AUTH_SECRET        — секрет для подписи сессии (обязателен)
 *   AUTH_GOOGLE_ID     — Client ID из Google Cloud Console
 *   AUTH_GOOGLE_SECRET — Client Secret оттуда же
 *
 * Callback URL для Google OAuth: {origin}/api/auth/callback/google
 * (локально: http://localhost:3000/api/auth/callback/google)
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  trustHost: true,
});
