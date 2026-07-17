# Промпт для бэкенда: Stories (24ч) + Live (прямой эфир)

> Отдай бэкенд-разработчику. Стиль как у остального API: ответы в конверте
> `{ data, errors, statusCode }`, авторизация Bearer JWT, файлы — `multipart/form-data`,
> имена файлов отдаются из `/images/…`. Роуты и имена полей — как ниже (фронт под них пишется).

---

## Часть 1. Stories (истории, 24 часа)

Существующий Story-контроллер урезан. Нужен полноценный:

- **Сущность Story:** `storyId, userId, userName, userImage, fileName, isVideo, durationSec,
  createdAt, expiresAt (createdAt+24ч), viewsCount, isViewedByMe, likesCount, isLikedByMe`.

- `POST /Story/add` — `multipart/form-data`: `File` (image/video), опц. `durationSec`.
  Больше НЕ требовать `PostId` (история сама по себе).
- `GET /Story/get-active` — активные (не истёкшие), **сгруппированы по пользователю**:
  `[{ userId, userName, userImage, hasUnseen, stories: [Story...] }]`.
  Сортировка: сначала те, у кого есть непросмотренные (`hasUnseen`), как в Instagram (кольцо).
- `GET /Story/get-user-stories/{userId}` — активные истории одного юзера.
- `POST /Story/view?storyId` — отметить просмотр (растит `viewsCount`, ставит `isViewedByMe`).
- `POST /Story/like?storyId` — лайк истории.
- `POST /Story/reply?storyId` (json `{ text }`) — ответ уходит в личку автору (в чат).
- `GET /Story/viewers?storyId` — список посмотревших (только автор): `[{ userId, userName, userImage, viewedAt }]`.
- `DELETE /Story/delete?storyId` — удалить свою.
- Истёкшие (>24ч) не отдавать в get-active; фоновая чистка или фильтр по `expiresAt`.

**Фронт покажет:** кольцо-историй с градиентом Instagram (непросмотренные — цветное,
просмотренные — серое), полноэкранный вьюер с прогресс-барами, просмотры/лайки/ответы.

---

## Часть 2. Live / прямой эфир

Кнопка «+» даёт выбор: **Опубликовать историю** или **Начать эфир**. Для эфира нужен API.

### Транспорт (на выбор бэкенда)
- **Проще всего:** переиспользовать уже работающий WebRTC-сигналинг (как у звонков) —
  вещатель = один publisher, зрители подключаются как subscribers через сервер-релей (SFU/mediasoup),
  ИЛИ вещатель шлёт свой поток, сервер раздаёт по WebRTC каждому зрителю.
- **Либо HLS:** вещатель публикует (WebRTC→сервер), сервер отдаёт зрителям `.m3u8` (HLS) —
  проще масштабируется, но задержка выше.
Верни в ответах то, что нужно фронту для подключения (ниже — `ingest`/`playback`).

### Сущность Live
`liveId, hostUserId, hostUserName, hostUserImage, title, status ("live"|"ended"),
startedAt, endedAt, viewerCount, playbackUrl (или webrtc room id), ingest (для хоста)`.

### Эндпоинты
- `POST /Live/start` (json `{ title }`) → создаёт эфир, статус "live".
  Ответ: `{ liveId, ingest: {...как хосту публиковать...}, playbackUrl / roomId }`.
- `GET /Live/active` → список идущих эфиров (для ленты/сторибара):
  `[{ liveId, hostUserId, hostUserName, hostUserImage, title, viewerCount, startedAt }]`.
- `GET /Live/{liveId}` → детали эфира + как зрителю подключиться (`playbackUrl`/`roomId`).
- `POST /Live/{liveId}/join` → зритель вошёл (viewerCount++), вернуть параметры подключения.
- `POST /Live/{liveId}/leave` → зритель вышел (viewerCount--).
- `POST /Live/{liveId}/comment` (json `{ text }`) → комментарий в эфире (real-time).
- `POST /Live/{liveId}/reaction` (json `{ emoji }`) → летящее сердечко/эмодзи.
- `POST /Live/{liveId}/end` → хост завершает (status "ended", endedAt).
- **Real-time для зрителей** (комменты, реакции, viewerCount, "эфир завершён") —
  через WebSocket/SignalR (напр. `/liveHub`) с событиями
  `Comment`, `Reaction`, `ViewerCount`, `Ended`.

### Уведомления
- При `Live/start` — разослать подписчикам хоста уведомление `type="live"` (см. Notification),
  чтобы фронт показал кольцо «LIVE» с красной подписью.

---

## Общее
- Не ломать существующие эндпоинты. Обновить Swagger (описать `data` в ответах).
- Все списки — в том же конверте; при пагинации — `PageNumber/PageSize`.
- Файлы историй раздавать так же, как посты (`/images/{fileName}`); для видео — тот же хост.

Как поднимешь — пришли готовые роуты, я подключу фронт (сторибар с кольцами,
вьюер историй, кнопка выбора Story/Live, экран эфира с чатом и реакциями).
