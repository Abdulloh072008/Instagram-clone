import "next-auth";
import "next-auth/jwt";

// Расширяем сессию/JWT: пробрасываем id внешнего аккаунта (Google sub),
// чтобы можно было привязать его к пользователю softclub.
declare module "next-auth" {
  interface Session {
    provider?: string;
    providerAccountId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    providerAccountId?: string;
  }
}
