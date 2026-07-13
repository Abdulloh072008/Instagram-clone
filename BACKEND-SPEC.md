# Промпт: доработка бэкенда Instagram (softclub API)

> Скопируй весь этот файл и отдай бэкенд-разработчику или ИИ. Ниже — контекст
> существующего API и список недостающих эндпоинтов, которые нужны фронтенду.

---

## Контекст (как устроен текущий бэкенд)

- Стек: **ASP.NET Core Web API + JWT**. База: `https://instagram-api.softclub.tj`, Swagger: `/swagger/index.html`.
- **Все ответы обёрнуты в конверт:** `{ "data": <payload>, "errors": string[], "statusCode": number }`.
  Пагинированные списки: `{ pageNumber, pageSize, totalPage, totalRecord, data: [...], errors, statusCode }`.
- **Авторизация:** JWT Bearer. В токене claims: `sid` = userId, `name` = userName, `email`, `role`.
- **Картинки/файлы:** хранятся по имени, отдаются как `GET /images/{fileName}`. Загрузка — `multipart/form-data`.
- Контроллеры уже есть: `Account`, `User`, `UserProfile`, `Post`, `Story`, `Chat`,
  `FollowingRelationShip`, `Location`.

**Требование:** сохранять тот же стиль (конверт `{data,errors,statusCode}`, имена в стиле существующих
эндпоинтов, авторизация по JWT, `multipart/form-data` для файлов).

---

## Что нужно добавить (по приоритету)

### 1. 🔔 Notifications (уведомления) — контроллера НЕТ вообще
Фронт показывает колокольчик и «лайкнул/подписался/прокомментировал», но эндпоинтов нет.

- `GET /Notification/get-notifications?PageNumber&PageSize` → список уведомлений текущего юзера.
  Элемент: `{ notificationId, type ("like"|"comment"|"follow"|"mention"), fromUserId, fromUserName, fromUserImage, postId?, commentId?, text?, isRead, createdAt }`
- `GET /Notification/get-unread-count` → `{ data: number }`
- `POST /Notification/mark-read?notificationId` → отметить одно прочитанным
- `POST /Notification/mark-all-read` → отметить все
- Уведомления должны **создаваться автоматически** при like-post, add-comment, add-following-relation-ship.

### 2. 👤 Полное редактирование профиля — сейчас `update-user-profile` принимает ТОЛЬКО `about` + `gender`
GET-профиль возвращает `firstName, lastName, occupation, dob, locationId, userName`, но изменить их нельзя.

- Расширить `PUT /UserProfile/update-user-profile` (application/json), принимать:
  `{ firstName, lastName, occupation, about, gender, dob, locationId, website }`
- Добавить `PUT /Account/change-username` → `{ newUserName }` (проверка уникальности).

### 3. 🔎 Explore / Хэштеги — есть только поиск юзеров (`/User/get-users`)
Дизайн «AI Discovery Hub» требует ленту исследования и теги.

- `GET /Post/get-explore?PageNumber&PageSize` → случайные/популярные посты не от тех, на кого подписан.
- Хэштеги: при `add-post` парсить `#tag` из `content`. Добавить:
  - `GET /Tag/search?query` → список тегов с количеством постов
  - `GET /Tag/get-posts-by-tag?tag&PageNumber&PageSize` → посты по тегу
- `GET /User/get-users` — сейчас поиск норм, но пусть **возвращает `isFollowing: bool`** для текущего юзера (см. п.9).

### 4. 🎬 Настоящие Reels — сейчас `get-reels` возвращает обычные посты с картинками
Нет признака видео/длительности/звука.

- В сущности Post добавить поля: `isReel: bool`, `videoUrl: string?`, `durationSec: number?`, `audioName: string?`.
- `POST /Post/add-post` — принимать видеофайл (`Video`), не только `Images`.
- `GET /Post/get-reels` — возвращать только `isReel = true`.

### 5. 📖 Ответы и реакции на истории — сейчас только `LikeStory` + `add-story-view`
Дизайн Stories показывает «Send message» и эмодзи-реакции.

- `POST /Story/reply-to-story?storyId` (application/json) `{ text }` → создаёт сообщение в чат автору истории.
- `POST /Story/react-story?storyId` `{ emoji }` → эмодзи-реакция.
- Уточнить схему истории в Swagger (сейчас `stories` часто приходит пустым, поля не документированы):
  `{ storyId, userId, fileName, isVideo, createdAt, viewsCount, isViewedByMe, likesCount, isLikedByMe }`.
- `AddStories` сейчас требует `PostId` (история привязана к посту) — сделать `PostId` **необязательным**,
  разрешить публиковать историю просто по картинке/видео.

### 6. 💬 Чат / Direct — критичные пробелы
- **Реалтайм:** добавить **SignalR hub** (`/chatHub`) с событиями `ReceiveMessage`, `MessageRead`, `Typing`.
  Сейчас фронт опрашивает каждые 5 сек — это костыль.
- `GET /Chat/get-chats` — добавить в каждый элемент: `lastMessageText`, `lastMessageDate`, `unreadCount`.
  (Сейчас нет ни превью, ни времени, ни счётчика непрочитанных.)
- Прочитано: `POST /Chat/mark-read?chatId` + поле `isRead` у сообщения → бейдж «Read» в дизайне.
- «Active now» / онлайн-статус: `GET /User/get-online-status?userId` или через SignalR presence.
- Голосовые сообщения: разрешить в `send-message` аудиофайл (в дизайне есть иконка микрофона).
- Звонки (иконки телефон/видео): контроллер `Call` уже есть на ветке backchaos — довести до рабочего
  (create-call / accept / decline / end + сигналинг через SignalR).

### 7. 💭 Комментарии — сейчас только add / delete
- `POST /Post/like-comment?commentId` → лайк комментария (+ поле `likeCount`, `isLiked` в комментарии).
- `POST /Post/reply-comment` `{ parentCommentId, comment }` → вложенные ответы (+ `parentCommentId` в схеме).
- (Опционально) `PUT /Post/edit-comment` `{ commentId, comment }`.

### 8. ❤️ Кто лайкнул / посмотрел — сейчас `userLikes` и `userViews` всегда `null`
- `GET /Post/get-post-likes?postId&PageNumber&PageSize` → список юзеров, поставивших лайк.
- `GET /Post/get-post-views?postId` → счётчик/список просмотров.
- `GET /Story/get-story-viewers?storyId` → кто посмотрел историю (важно для автора).

### 9. 🧷 Follow-статус в списках — фронт не знает, подписан ли уже юзер
- В `GET /User/get-users` и `GET /FollowingRelationShip/get-subscribers|get-subscriptions`
  добавить в каждый элемент `isFollowing: bool` (относительно текущего юзера).
  Сейчас кнопки Follow всегда стартуют в состоянии «Follow».

### 10. 🗂️ Коллекции сохранённого — есть только плоский `add-post-favorite`
Дизайн «Collaborative Collection» требует именованные подборки.
- `POST /Collection/create` `{ name }`, `GET /Collection/get-my-collections`,
  `POST /Collection/add-post` `{ collectionId, postId }`, `GET /Collection/get-posts?collectionId`.

### 11. 🔐 Auth — мелочи
- `POST /Account/refresh-token` `{ refreshToken }` → новый access-токен (сейчас JWT живёт ~1 год, refresh нет).
- `POST /Account/logout` (инвалидация refresh-токена на сервере).
- Довести `ForgotPassword` / `ResetPassword` (сейчас это `DELETE` с неочевидными параметрами —
  сделать `POST` с телом `{ email }` и `{ token, newPassword }`).

---

## Общие пожелания
- Не ломать существующие эндпоинты — только расширять поля и добавлять новые.
- Все новые списки — пагинированные, в том же конверте.
- Обновить Swagger: сейчас у многих ответов (Post, UserProfile, Story, Chat) не описаны схемы `data`.
- Автосоздание уведомлений (п.1) — через доменные события, чтобы не дублировать логику в контроллерах.
