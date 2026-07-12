# API-клиент Instagram

Типизированный клиент для бэкенда `https://instagram-api.softclub.tj`.
Все запросы уже написаны — импортируешь и вызываешь. Токен после логина
подставляется автоматически.

## Быстрый старт

```ts
import { accountApi, postApi, storyApi, authToken } from "@/lib/api";

// Регистрация
await accountApi.register({
  userName: "vasya",
  fullName: "Вася Пупкин",
  email: "vasya@mail.com",
  password: "Qwerty123!",
  confirmPassword: "Qwerty123!",
});

// Вход — токен сохранится сам, дальше все запросы авторизованы
await accountApi.login({ userName: "vasya", password: "Qwerty123!" });

// Лента постов
const res = await postApi.getPosts({ pageNumber: 1, pageSize: 10 });
console.log(res.data);

// Выход
authToken.clearToken();
```

## Формат ответа

Почти все ручки отдают конверт `ApiResponse<T>`:

```ts
{ data: T; errors: string[] | null; statusCode: number }
```

Данные лежат в `res.data`.

## Ошибки

Неуспешный запрос (не 2xx или с `errors`) кидает `ApiError`:

```ts
import { ApiError } from "@/lib/api";

try {
  await accountApi.login({ userName: "x", password: "bad" });
} catch (e) {
  if (e instanceof ApiError) {
    console.log(e.status, e.errors); // HTTP-статус и массив ошибок
  }
}
```

## Загрузка файлов

`addPost`, `addStory`, `sendMessage`, `updateUserImageProfile` принимают
`File`/`File[]` (например из `<input type="file">`) — multipart собирается внутри:

```ts
await postApi.addPost({ title: "Море", content: "Отдых", images: [file1, file2] });
await userProfileApi.updateUserImageProfile(avatarFile);
```

## Модули (по контроллерам свагера)

| Импорт | Контроллер |
|--------|-----------|
| `accountApi` | Account (register, login, пароли) |
| `userApi` | User (поиск, история поиска) |
| `userProfileApi` | UserProfile (профиль, аватар, избранное) |
| `postApi` | Post (посты, рилсы, лайки, комменты) |
| `storyApi` | Story (сторис, просмотры, лайки) |
| `chatApi` | Chat (чаты, сообщения) |
| `followingApi` | FollowingRelationShip (подписки) |
| `locationApi` | Location (локации) |

## Смена базового адреса

По умолчанию бьёт в прод. Чтобы переключить (напр. на локальный бэк) —
задай переменную окружения в `.env.local`:

```
NEXT_PUBLIC_API_URL=https://твой-адрес
```
