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
  // Регистрируем Google только если заданы креды — иначе кнопка вела бы на
  // ошибку Google «Missing required parameter: client_id». На серверах без
  // .env.local (у тиммейтов) Google-провайдера просто не будет, кнопка скроется.
  providers: process.env.AUTH_GOOGLE_ID ? [Google] : [],
  trustHost: true,
  callbacks: {
    // Сохраняем id внешнего аккаунта в токен при первом входе...
    jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    // ...и прокидываем его в сессию, чтобы фронт мог привязать Google к softclub.
    session({ session, token }) {
      session.provider = token.provider;
      session.providerAccountId = token.providerAccountId;
      return session;
    },
  },
});

