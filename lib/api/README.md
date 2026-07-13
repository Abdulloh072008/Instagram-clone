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

## Форматы ответа (проверено на живом API)

Бэк отдаёт **три разных формата** — типы это уже учитывают:

1. **Обычный конверт** `ApiResponse<T>` (login, get-chats, get-my-profile, …):
   ```ts
   { data: T; errors: string[] | null; statusCode: number }
   ```
2. **Список с пагинацией** `PagedResponse<T>` (get-posts, get-reels, get-users,
   get-following-post, get-locations, get-post-favorites):
   ```ts
   { data: T[]; pageNumber; pageSize; totalPage; totalRecord; errors; statusCode }
   ```
   ```ts
   const res = await postApi.getPosts({ pageNumber: 1, pageSize: 10 });
   res.data;        // сами посты
   res.totalRecord; // сколько всего
   ```
3. **Голый массив без конверта** — только `get-stories` (общая лента):
   возвращается `StoryGroup[]` напрямую, `res` — это уже массив, `.data` нет.
   А вот `get-my-stories` и `get-user-stories` — наоборот, конверт с одной
   группой: `ApiResponse<StoryGroup>` (данные в `res.data.stories`).

## Проверено вживую

Все 8 контроллеров прогнаны сквозным тестом по живому API (регистрация,
логин, загрузка файлов, весь CRUD) — **46/48 запросов проходят**.
Два оставшихся падают из-за багов на самом бэкенде, не в клиенте:

- `Location/update-Location` → 400 `Missing type map configuration
  (UpdateLocationDto -> Location)`. Сломан AutoMapper на сервере. Проверены
  все варианты запроса (JSON, query, без id) — сервер падает в своём коде
  маппинга. **Клиентом не чинится, только бэкенд-команда.**
- `Post/delete-post` → 500, если на пост ссылается сторис (FK, каскад на
  сервере не настроен). **Обходится на клиенте:** используй `postApi.deletePostSafe(id)`
  — она сначала удалит твои сторис этого поста, потом сам пост. Проверено:
  удаляет пост даже с лайком/избранным/комментом/сторис.

```ts
await postApi.deletePostSafe(postId); // безопасно, вместо deletePost
```

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
