# Notification API — точная схема, которую дёргает фронт

> Обновлено под доп-бэкенд без JWT. Фронт уже переписан под это (см. ниже),
> так что сделай ИМЕННО эти роуты/поля — тогда всё заработает без правок фронта.

## База и авторизация
- **База:** `https://instagramextraapi.onrender.com` (доп-бэкенд, тот же, где Call/Reaction/Repost).
- **JWT НЕ нужен.** `userId` фронт передаёт явно query-параметром `userId` (guid текущего юзера).
  Твоё решение «без авторизации, userId явно» — ОК, оставляем так. Настоящий JWT — отдельная задача.
- **Конверт ответа как везде:** `{ "data": <payload>, "errors": [], "statusCode": 200 }`.

## Ровно 4 эндпоинта (имена и параметры — точь-в-точь)

### 1) GET /Notification/get-notifications?userId={guid}&PageNumber=1&PageSize=20
Пагинированный конверт. Только уведомления юзера `userId`, сортировка по createdAt DESC:
```json
{
  "pageNumber": 1, "pageSize": 20, "totalPage": 3, "totalRecord": 42,
  "data": [
    {
      "notificationId": 12,
      "type": "like",                       // "like" | "comment" | "follow" | "mention"
      "fromUserId": "guid-того-кто-действие",
      "fromUserName": "vasya",
      "fromUserImage": "abc.jpg",           // имя файла (или null); фронт откроет как /images/abc.jpg
      "postId": 168,                        // для like/comment, иначе null
      "postImage": "def.jpg",               // превью поста (или null)
      "commentId": 2690,                    // для comment, иначе null
      "text": "текст коммента",             // для comment/mention, иначе null
      "isRead": false,
      "createdAt": "2026-07-13T10:00:00Z"
    }
  ],
  "errors": [], "statusCode": 200
}
```
⚠️ Поля именно в camelCase и ровно с этими именами — фронт читает их напрямую.

### 2) GET /Notification/get-unread-count?userId={guid}
```json
{ "data": 5, "errors": [], "statusCode": 200 }
```

### 3) POST /Notification/mark-read?notificationId={int}
Помечает одно уведомление isRead=true. → `{ "data": true, ... }`

### 4) POST /Notification/mark-all-read?userId={guid}
Помечает все уведомления юзера прочитанными. → `{ "data": true, ... }`

## Автосоздание (в основном API-действиях или через общий сервис)
- лайк поста      → type="like",    RecipientUserId = автор поста, postId + postImage
- комментарий     → type="comment", RecipientUserId = автор поста, text, commentId, postId
- подписка        → type="follow",  RecipientUserId = тот, на кого подписались
- НЕ создавать, если fromUserId == RecipientUserId (сам себе).
- `fromUserName` / `fromUserImage` / `postImage` — сохраняй в момент создания (имена файлов как в основном API).

## CORS
Фронт (localhost и прод) шлёт обычный GET/POST без заголовка Authorization.
Разреши CORS для источника фронта (или `*`), методы GET/POST.

---
### Что уже готово на фронте (не трогать — просто справка)
- `lib/services.ts` → `notifications.list(userId,page,size)`, `.unreadCount(userId)`,
  `.markRead(id)`, `.markAllRead(userId)` — все бьют в доп-бэкенд, JWT не шлют.
- Страница `/notifications` + панель в сайдбаре + бейдж непрочитанных.
- Пока эндпоинты не подняты — фронт показывает пустое состояние, не падает.
