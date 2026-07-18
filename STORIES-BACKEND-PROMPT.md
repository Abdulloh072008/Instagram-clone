# Stories API — точная схема, которую дёргает фронт

> Сырой to-do прислал фронтендер; здесь он сведён в точные роуты/поля.
> Фронт уже частично переписан под истории (viewer со свайпом, seen-state,
> видео-таймер, 24h-фильтр, мульти-аплоад). Сделай **ИМЕННО** эти поля/роуты —
> тогда фронт переключится с воркэраундов минимальными правками.
>
> ⚠️ Этот файл — канон для историй и **уточняет** `BACKEND-SPEC.md §5`
> (там были другие имена полей: `isViewedByMe`/`likesCount`). Имена ниже —
> главные, ориентируйся на них.

## База и авторизация
- **База:** `https://instagram-api.softclub.tj` (основной API, не доп-бэкенд).
- **JWT нужен.** Все `/Story/*` идут с `Authorization: Bearer <jwt>` текущего юзера.
  Значит `isViewed` / `isLiked` считаются относительно юзера из токена — query-параметр `userId` не нужен.
- **Конверт** для POST/DELETE — как везде на main API: `{ "data": <payload>, "errors": [], "statusCode": 200 }`.
  **`get-stories` — исключение:** возвращает **голый массив групп** (не конверт), как сейчас. Не оборачивай.

## Приоритет
**#1 и #2 сначала** — правят корректность с минимумом работы (одни поля + серверный TTL, новых роутов нет).
**#3** — быстрая проверка. **#4/#5** заменяют две сфейканные фичи. **Optional** — по желанию.

---

## 1) Поля в ответе get-stories (главный выигрыш, без новых роутов)
Касается `GET /Story/get-stories`, `GET /Story/get-my-stories`, `GET /Story/get-user-stories/{userId}`.
Форма ответа та же (массив групп юзеров), просто **добавь поля в каждый story item**.

Сейчас item приходит примерно так (поля не документированы, часто `stories` пустой):
```json
{ "storyId": 42, "fileName": "abc.mp4", "postId": 168, "createAt": "2026-07-15T10:00:00Z" }
```

Нужно (camelCase, ровно эти имена — фронт читает напрямую):
```json
{
  "storyId": 42,
  "fileName": "abc.mp4",
  "postId": 168,                       // null, если история не привязана к посту (см. #3/#5)
  "createAt": "2026-07-15T10:00:00Z",
  "isVideo": true,                     // бэк решает по content-type; фронт больше не гадает по расширению
  "isViewed": false,                   // видел ли ТЕКУЩИЙ юзер (из JWT) — переживает смену устройства
  "isLiked": true,                     // лайкнул ли текущий юзер
  "likeCount": 12,                     // всего лайков
  "viewCount": 34,                     // всего просмотров (сейчас есть storyView — переименуй/добавь как viewCount)
  "expiresAt": "2026-07-16T10:00:00Z"  // createAt + 24h (см. #2)
}
```
Полная форма группы (не меняется):
```json
{ "userId": "guid", "userName": "vasya", "userImage": "ava.jpg", "stories": [ /* items выше */ ] }
```
Это в одиночку чинит seen-ring и лайки на всех устройствах — без переписи фронта, только чтение полей.

## 2) 24h-экспирация на сервере
Сейчас браузер сам прячет истории старше 24ч (`freshStories` в `components/StoriesBar.tsx`). Перенеси на бэк:
- Ставь `expiresAt = createAt + 24h` при создании.
- **Исключай протухшие** из `get-stories` / `get-my-stories` / `get-user-stories`.
- Желательно фоновым джобом удалять/архивировать протухшие.

## 3) Видео в AddStories
`POST /Story/AddStories` — поле формы называется буквально `Image`, query `PostId` (сейчас обязателен).
- Подтверди, что принимает `.mp4/.webm/.mov`; если только картинки — расширь допустимые content-type
  (или переименуй поле в `File`). Без этого видео-истории отклоняются.
- Сделай **`PostId` необязательным** — история не обязана быть привязана к посту (иначе ломается reply, см. #5).

## 4) Реакции на истории (сейчас сфейкано)
Story-reaction эндпоинта нет, поэтому фронт **абьюзит** `POST /Reaction/add` на доп-бэкенде,
подсовывая `storyId` в поле `postId` (коллизия, если пост и история совпали по id). Добавь настоящие на main API:

- **`POST /Story/AddStoryReaction`** — body `{ "storyId": 42, "emoji": "🔥" }` → `{ "data": true, ... }`.
  Один юзер = одна реакция на историю (повторный вызов заменяет эмодзи).
- **`GET /Story/get-story-reactions?storyId=42`** →
  ```json
  { "data": { "total": 3, "mine": "🔥", "byEmoji": [ { "emoji": "🔥", "count": 2 }, { "emoji": "😍", "count": 1 } ] }, "errors": [], "statusCode": 200 }
  ```
  `mine` — эмодзи текущего юзера или `null`.
- **`DELETE /Story/RemoveStoryReaction?storyId=42`** → `{ "data": true, ... }`.

## 5) Ответ на историю (сейчас сфейкано)
Story-reply эндпоинта нет. Сейчас поле «Reply» работает **только если у истории есть `postId`** и постит
**комментарий к тому посту**, а не отвечает автору истории (`sendReply` в `StoryViewer.tsx`). Добавь:

- **`POST /Story/AddStoryReply`** — body `{ "storyId": 42, "text": "огонь!" }` →
  создаёт **сообщение в чат автору истории** (как в Instagram), `{ "data": true, ... }`.
  Не зависит от `postId`.

## Optional
- **Мульти-аплоад одним запросом:** `AddStories` берёт один файл, фронт **циклит по файлам**
  (`onPickFiles` в `StoriesBar.tsx`). Прими `Files[]` — тогда будет один батч-запрос.
- **`GET /Story/get-story-viewers?storyId=42`** → кто посмотрел (список юзеров) — важно автору.

## CORS
Фронт (localhost и прод) шлёт GET/POST/DELETE с `Authorization: Bearer`. Разреши CORS для источника
фронта, методы GET/POST/DELETE и заголовок `Authorization`.

---
### Что уже есть/сфейкано на фронте (справка — фронтендер сам перепишет, когда роуты встанут)
- `lib/services.ts` → `stories.all/mine/byUser/like/view/add/remove` уже бьют в main API.
  `stories.react` (строка ~107) — **фейк** через доп-бэкенд `/Reaction/add`; заменится на `AddStoryReaction` (#4).
- `components/StoryViewer.tsx` → `liked`/`reacted` живут в локальном `useState` (не переживают перезагрузку);
  `sendReply` шлёт `posts.addComment(story.postId, …)` — заменится на `AddStoryReply` (#5).
  После #1 лайк/реакции/seen читаются из полей ответа.
- `lib/seenStories.ts` → seen-state в `localStorage`; после `isViewed` (#1) localStorage становится лишь кэшем.
- `components/StoriesBar.tsx` → `freshStories()` фильтрует 24ч на клиенте; уйдёт после #2.
  `onPickFiles` циклит аплоад по файлам; свернётся в один вызов после Optional `Files[]`.
- `lib/types.ts` → `StoryItem` уже допускает лишние поля (`[key: string]: unknown`), новые поля не сломают типы.
