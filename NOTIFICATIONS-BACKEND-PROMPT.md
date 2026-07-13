# Промпт для бэкенда: контроллер Notification

> Отдай этот файл бэкенд-разработчику или ИИ. Схема полей и роутов точно
> совпадает с тем, что уже ожидает фронтенд (`/notifications` + бейдж в сайдбаре).

```text
Добавь контроллер Notification в ASP.NET Core API (стиль как у остальных:
ответ в конверте {data, errors, statusCode}, авторизация JWT, userId = claim "sid").

Сущность Notification:
  Id (int, PK)
  RecipientUserId (string)   — кому уведомление (текущий юзер видит свои)
  Type (string enum): "like" | "comment" | "follow" | "mention"
  FromUserId (string), FromUserName (string), FromUserImage (string?)  — кто инициировал
  PostId (int?), PostImage (string?)   — для like/comment: id поста и имя файла превью
  CommentId (int?)
  Text (string?)             — текст комментария/упоминания (для превью)
  IsRead (bool, default false)
  CreatedAt (DateTime, UTC)

Эндпоинты:

1) GET /Notification/get-notifications?PageNumber=1&PageSize=20
   → пагинированный конверт:
   {
     pageNumber, pageSize, totalPage, totalRecord,
     data: [{
       notificationId, type, fromUserId, fromUserName, fromUserImage,
       postId, postImage, commentId, text, isRead, createdAt
     }],
     errors: [], statusCode: 200
   }
   Только уведомления текущего юзера (RecipientUserId == sid), сортировка по CreatedAt DESC.
   ВАЖНО: имена полей в data именно такие (camelCase), тип — строка из списка выше.

2) GET /Notification/get-unread-count
   → { data: <число непрочитанных>, errors: [], statusCode: 200 }

3) POST /Notification/mark-read?notificationId=123
   → помечает одно уведомление IsRead = true (только своё). { data: true, ... }

4) POST /Notification/mark-all-read
   → помечает все уведомления текущего юзера прочитанными. { data: true, ... }

Автосоздание уведомлений (через доменные события/сервис, НЕ дублировать в контроллерах):
  - like-post      → Type="like",   RecipientUserId = автор поста, PostId/PostImage заполнить
  - add-comment    → Type="comment", RecipientUserId = автор поста, Text = текст коммента, CommentId
  - add-following-relation-ship → Type="follow", RecipientUserId = тот, на кого подписались
  Не создавать уведомление, если FromUserId == RecipientUserId (сам себе).
```

## Что уже готово на фронте (чтобы бэкендер понимал контекст)
- Сервис-обёртки: `lib/services.ts` → `notifications.list / unreadCount / markRead / markAllRead`
- Страница: `app/(app)/notifications/page.tsx` (группировка Today / This Week / Earlier)
- Бейдж непрочитанных: `components/Sidebar.tsx` (опрос `get-unread-count` каждые 30 сек)
- Тип: `AppNotification` в `lib/types.ts`

Как только эндпоинты заработают — фронт подхватит данные автоматически, без изменений.
