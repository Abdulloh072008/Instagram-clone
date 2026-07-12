"use client";

import { useState, useEffect, useCallback } from "react";
import {
  accountApi, userApi, userProfileApi, postApi, storyApi, chatApi, followingApi, locationApi,
  authToken, getCurrentUser, type Post, type User, type UserProfile, type Reel,
  type Subscriber, type ChatSummary, type ChatMessage, type Location, type CurrentUser,
} from "@/lib/api";
import type { StoryGroup } from "@/lib/api/story";
import { LogProvider, LogDrawer, useLog, Btn, Input, TextArea, Card, Avatar, Modal, fmtDate } from "./ui";
import { PostModal, StoryViewer, PostThumb, Media } from "./components";

type Tab = "home" | "explore" | "reels" | "search" | "messages" | "create" | "profile" | "locations" | "account";

const NAV: { key: Tab; icon: string; label: string }[] = [
  { key: "home", icon: "🏠", label: "Главная" },
  { key: "explore", icon: "🧭", label: "Интересное" },
  { key: "reels", icon: "🎬", label: "Reels" },
  { key: "search", icon: "🔍", label: "Поиск" },
  { key: "messages", icon: "✉️", label: "Сообщения" },
  { key: "create", icon: "➕", label: "Создать" },
  { key: "profile", icon: "👤", label: "Профиль" },
  { key: "locations", icon: "📍", label: "Локации" },
  { key: "account", icon: "⚙️", label: "Аккаунт" },
];

export default function Page() {
  return (
    <LogProvider>
      <Shell />
      <LogDrawer />
    </LogProvider>
  );
}

function Shell() {
  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [openPost, setOpenPost] = useState<number | null>(null);
  const [openStory, setOpenStory] = useState<number | null>(null);
  const [openUser, setOpenUser] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setAuthed(authToken.isAuthenticated());
    setMe(getCurrentUser());
  }, []);
  // Токен доступен только на клиенте — читаем его после монтирования,
  // чтобы SSR и первый клиентский рендер совпали (иначе рассинхрон гидрации).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => refresh(), [refresh]);

  if (!authed) return <AuthScreen onAuthed={refresh} />;

  const ctx = { myId: me?.userId, openPost: setOpenPost, openStory: setOpenStory, openUser: setOpenUser };

  return (
    <div className="flex min-h-screen">
      {/* сайдбар */}
      <nav className="sticky top-0 h-screen w-16 lg:w-56 shrink-0 border-r border-black/10 dark:border-white/15 p-2 lg:p-4 flex flex-col gap-1">
        <div className="text-xl font-bold px-2 py-3 hidden lg:block">Instagram</div>
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={"flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 " + (tab === n.key ? "font-bold bg-black/5 dark:bg-white/10" : "")}
          >
            <span className="text-xl">{n.icon}</span>
            <span className="hidden lg:inline text-sm">{n.label}</span>
          </button>
        ))}
        <div className="mt-auto text-[11px] opacity-50 px-2 hidden lg:block">@{me?.userName}</div>
      </nav>

      {/* контент */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pb-[45vh]">
        {tab === "home" && <HomeView {...ctx} />}
        {tab === "explore" && <ExploreView {...ctx} />}
        {tab === "reels" && <ReelsView {...ctx} />}
        {tab === "search" && <SearchView {...ctx} />}
        {tab === "messages" && <MessagesView myId={me?.userId} />}
        {tab === "create" && <CreateView />}
        {tab === "profile" && <ProfileView myId={me?.userId} openPost={setOpenPost} openUser={setOpenUser} />}
        {tab === "locations" && <LocationsView />}
        {tab === "account" && <AccountView myId={me?.userId} onLogout={refresh} />}
      </main>

      {openPost != null && <PostModal postId={openPost} myId={me?.userId} onClose={() => setOpenPost(null)} />}
      {openStory != null && <StoryViewer storyId={openStory} myId={me?.userId} onClose={() => setOpenStory(null)} />}
      {openUser != null && <UserProfileModal userId={openUser} myId={me?.userId} onClose={() => setOpenUser(null)} openPost={setOpenPost} />}
    </div>
  );
}

interface Ctx {
  myId?: string;
  openPost: (id: number) => void;
  openStory: (id: number) => void;
  openUser: (id: string) => void;
}

// ── auth ─────────────────────────────────────────────────────────────────────

function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const { run } = useLog();
  const [tab, setTab] = useState<"login" | "register">("register");
  const [f, setF] = useState({ userName: "", fullName: "", email: "", password: "Qwerty123!" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const suggest = () => {
    const n = "user" + Math.floor(Math.random() * 100000);
    setF({ userName: n, fullName: "Test " + n, email: n + "@mail.com", password: "Qwerty123!" });
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm border border-black/10 dark:border-white/15 rounded-2xl p-6 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-center">Instagram</h1>
        <div className="flex gap-3 justify-center text-sm">
          <button onClick={() => setTab("register")} className={tab === "register" ? "font-bold underline" : "opacity-60"}>Регистрация</button>
          <button onClick={() => setTab("login")} className={tab === "login" ? "font-bold underline" : "opacity-60"}>Вход</button>
          <button onClick={suggest} className="ml-auto text-xs opacity-60 underline">тестовый</button>
        </div>
        <Input placeholder="userName" value={f.userName} onChange={(e) => set("userName", e.target.value)} />
        {tab === "register" && <Input placeholder="fullName" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />}
        {tab === "register" && <Input placeholder="email" value={f.email} onChange={(e) => set("email", e.target.value)} />}
        <Input placeholder="password" type="text" value={f.password} onChange={(e) => set("password", e.target.value)} />
        {tab === "register" ? (
          <Btn onClick={() => run("register", () => accountApi.register({ userName: f.userName, fullName: f.fullName, email: f.email, password: f.password, confirmPassword: f.password }))}>
            Зарегистрироваться
          </Btn>
        ) : null}
        <Btn variant={tab === "register" ? "ghost" : "primary"} onClick={() => run("login", () => accountApi.login({ userName: f.userName, password: f.password })).then(onAuthed)}>
          Войти
        </Btn>
      </div>
    </div>
  );
}

// ── home: сторис + лента ──────────────────────────────────────────────────────

function HomeView({ myId, openPost, openStory, openUser }: Ctx) {
  const { run } = useLog();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const loadStories = () => run("get-stories", () => storyApi.getStories()).then(setGroups).catch(() => {});
  const loadFeed = () => run("get-posts", () => postApi.getPosts({ pageNumber: 1, pageSize: 10 })).then((r) => setPosts(r.data)).catch(() => {});
  useEffect(() => { loadStories(); loadFeed(); }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* сторис */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {groups.map((g) => (
          <button key={g.userId} onClick={() => g.stories[0] && openStory(g.stories[0].id)} className="flex flex-col items-center gap-1 shrink-0" onContextMenu={(e) => { e.preventDefault(); openUser(g.userId); }}>
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400">
              <div className="p-0.5 bg-background rounded-full">
                <Avatar src={g.userImage} name={g.userName} size={56} />
              </div>
            </div>
            <span className="text-[11px] truncate max-w-16">{g.userName}</span>
          </button>
        ))}
        {groups.length === 0 && <span className="text-xs opacity-40 py-6">сторис нет</span>}
      </div>

      {/* лента */}
      {posts.map((p) => (
        <article key={p.postId} className="border border-black/10 dark:border-white/15 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 p-3">
            <button onClick={() => openUser(p.userId)}><Avatar src={p.userImage} name={p.userName ?? ""} size={34} /></button>
            <button onClick={() => openUser(p.userId)} className="text-sm font-semibold">@{p.userName}</button>
            <span className="ml-auto text-[11px] opacity-40">{fmtDate(p.datePublished)}</span>
          </div>
          <button onClick={() => openPost(p.postId)} className="block w-full">
            <Media file={Array.isArray(p.images) ? p.images[0] : (p.images as unknown as string)} className="w-full aspect-square object-cover" />
          </button>
          <div className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-4 text-xl">
              <button onClick={() => run("like-post", () => postApi.likePost(p.postId)).then(loadFeed)}>{p.postLike ? "❤️" : "🤍"}</button>
              <button onClick={() => openPost(p.postId)}>💬</button>
              <button className="ml-auto" onClick={() => run("add-post-favorite", () => postApi.addPostFavorite({ postId: p.postId }))}>🔖</button>
            </div>
            <div className="text-sm font-semibold">{p.postLikeCount} отметок «Нравится»</div>
            {p.title && <div className="text-sm"><b>@{p.userName}</b> {p.title}</div>}
            <button onClick={() => openPost(p.postId)} className="text-xs opacity-50 text-left">Смотреть все комментарии ({p.commentCount})</button>
          </div>
        </article>
      ))}
      <Btn variant="ghost" onClick={loadFeed} className="self-center">Обновить ленту</Btn>
    </div>
  );
}

// ── explore: сетка ───────────────────────────────────────────────────────────

function ExploreView({ openPost }: Ctx) {
  const { run } = useLog();
  const [posts, setPosts] = useState<Post[]>([]);
  const load = () => run("get-posts (explore)", () => postApi.getPosts({ pageNumber: 1, pageSize: 18 })).then((r) => setPosts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <Card title="Интересное" right={<Btn variant="ghost" onClick={load}>Обновить</Btn>}>
      <div className="grid grid-cols-3 gap-1">
        {posts.map((p) => <PostThumb key={p.postId} post={p} onClick={() => openPost(p.postId)} />)}
      </div>
    </Card>
  );
}

// ── reels ────────────────────────────────────────────────────────────────────

function ReelsView({ openPost }: Ctx) {
  const { run } = useLog();
  const [reels, setReels] = useState<Reel[]>([]);
  const load = () => run("get-reels", () => postApi.getReels({ pageNumber: 1, pageSize: 6 })).then((r) => setReels(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <Card title="Reels" right={<Btn variant="ghost" onClick={load}>Обновить</Btn>}>
      <div className="flex flex-col gap-4">
        {reels.map((r) => (
          <div key={r.postId} className="border border-black/10 dark:border-white/15 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <Avatar src={r.userImage} name={r.userName} size={32} />
              <b className="text-sm">@{r.userName}</b>
              {!r.isSubscriber && <Btn className="ml-auto py-0.5 text-xs" onClick={() => run("follow", () => followingApi.follow(r.userId))}>подписаться</Btn>}
            </div>
            <Media file={r.images} className="w-full max-h-[70vh] object-contain bg-black" />
            <div className="p-3 text-sm flex gap-4">
              <button onClick={() => run("like-post", () => postApi.likePost(r.postId)).then(load)}>{r.postLike ? "❤️" : "🤍"} {r.postLikeCount}</button>
              <button onClick={() => openPost(r.postId)}>💬 {r.commentCount}</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── search + история ─────────────────────────────────────────────────────────

function SearchView({ openUser }: Ctx) {
  const { run } = useLog();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [textHist, setTextHist] = useState<{ id: number; text: string }[]>([]);
  const [userHist, setUserHist] = useState<User[]>([]);

  const search = async () => {
    if (q.trim()) run("add-search-history", () => userApi.addSearchHistory(q)).catch(() => {});
    const r = await run("get-users", () => userApi.getUsers({ userName: q, pageNumber: 1, pageSize: 10 }));
    setUsers(r.data);
  };
  const loadHist = () => {
    run("get-search-histories", () => userApi.getSearchHistories()).then((r) => setTextHist((r.data as { id: number; text: string }[]) ?? [])).catch(() => {});
    run("get-user-search-histories", () => userApi.getUserSearchHistories()).then((r) => setUserHist((r.data as User[]) ?? [])).catch(() => {});
  };
  useEffect(() => { loadHist(); }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Поиск пользователей">
        <div className="flex gap-2">
          <Input placeholder="userName…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === "Enter" && search()} />
          <Btn onClick={search}>Искать</Btn>
        </div>
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2 text-sm">
            <button onClick={() => { openUser(u.id); run("add-user-search-history", () => userApi.addUserSearchHistory(u.id)).catch(() => {}); }} className="flex items-center gap-2">
              <Avatar src={u.avatar} name={u.userName} size={30} />
              <span className="font-medium">@{u.userName}</span>
              <span className="opacity-60">{u.fullName}</span>
            </button>
            <Btn variant="ghost" className="ml-auto py-0.5 text-xs" onClick={() => run("follow", () => followingApi.follow(u.id))}>подписаться</Btn>
          </div>
        ))}
      </Card>

      <Card title="История поиска" right={<Btn variant="ghost" onClick={loadHist}>Обновить</Btn>}>
        <div className="text-xs opacity-60">Текстовые запросы:</div>
        <div className="flex flex-wrap gap-2">
          {textHist.map((h) => (
            <span key={h.id} className="text-xs border rounded-full px-2 py-1 flex items-center gap-1">
              {h.text}
              <button onClick={() => run("delete-search-history", () => userApi.deleteSearchHistory(h.id)).then(loadHist)}>×</button>
            </span>
          ))}
          {textHist.length === 0 && <span className="text-xs opacity-40">пусто</span>}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" className="text-xs" onClick={() => run("delete-search-histories", () => userApi.deleteSearchHistories()).then(loadHist)}>Очистить текстовую</Btn>
          <Btn variant="ghost" className="text-xs" onClick={() => run("delete-user-search-histories", () => userApi.deleteUserSearchHistories()).then(loadHist)}>Очистить по юзерам</Btn>
        </div>
        <div className="text-xs opacity-60 mt-1">Недавние пользователи:</div>
        <div className="flex flex-wrap gap-2">
          {userHist.map((u) => (
            <button key={u.id} onClick={() => openUser(u.id)} className="text-xs border rounded-full px-2 py-1">@{u.userName}</button>
          ))}
          {userHist.length === 0 && <span className="text-xs opacity-40">пусто</span>}
        </div>
      </Card>
    </div>
  );
}

// ── messages ─────────────────────────────────────────────────────────────────

function MessagesView({ myId }: { myId?: string }) {
  const { run } = useLog();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [receiver, setReceiver] = useState("");

  const loadChats = () => run("get-chats", () => chatApi.getChats()).then((r) => setChats(r.data ?? [])).catch(() => {});
  const openChat = (id: number) => { setActive(id); run("get-chat-by-id", () => chatApi.getChatById(id)).then((r) => setMsgs(r.data ?? [])).catch(() => {}); };
  useEffect(() => { loadChats(); }, []);

  const send = () => {
    if (active == null) return;
    run("send-message", () => chatApi.sendMessage({ chatId: active, messageText: text, file: file ?? undefined })).then(() => { setText(""); setFile(null); openChat(active); });
  };
  const other = (c: ChatSummary) => (c.sendUserId === myId ? { name: c.receiveUserName, img: c.receiveUserImage } : { name: c.sendUserName, img: c.sendUserImage });

  return (
    <div className="flex flex-col gap-4">
      <Card title="Новый чат">
        <div className="flex gap-2">
          <Input placeholder="receiverUserId (из профиля)" value={receiver} onChange={(e) => setReceiver(e.target.value)} className="flex-1" />
          <Btn onClick={() => run("create-chat", () => chatApi.createChat(receiver)).then(loadChats)}>Создать</Btn>
        </div>
      </Card>

      <Card title="Диалоги" right={<Btn variant="ghost" onClick={loadChats}>Обновить</Btn>}>
        {chats.map((c) => {
          const o = other(c);
          return (
            <div key={c.chatId} className="flex items-center gap-2 text-sm">
              <button onClick={() => openChat(c.chatId)} className="flex items-center gap-2 flex-1">
                <Avatar src={o.img} name={o.name} size={34} />
                <span className="font-medium">@{o.name}</span>
                <span className="opacity-40 text-xs">#{c.chatId}</span>
              </button>
              <button className="text-xs text-red-500" onClick={() => run("delete-chat", () => chatApi.deleteChat(c.chatId)).then(() => { setActive(null); loadChats(); })}>удалить</button>
            </div>
          );
        })}
        {chats.length === 0 && <div className="text-xs opacity-40">чатов нет</div>}
      </Card>

      {active != null && (
        <Card title={`Чат #${active}`}>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {msgs.map((m) => (
              <div key={m.messageId} className={"flex gap-2 items-end " + (m.userId === myId ? "flex-row-reverse" : "")}>
                <Avatar src={m.userImage} name={m.userName} size={24} />
                <div className={"rounded-2xl px-3 py-1.5 text-sm max-w-[70%] " + (m.userId === myId ? "bg-blue-500 text-white" : "bg-black/10 dark:bg-white/15")}>
                  {m.messageText}
                  {m.file && <Media file={m.file} className="mt-1 rounded max-h-40" />}
                </div>
                {m.userId === myId && <button className="text-[10px] opacity-40" onClick={() => run("delete-message", () => chatApi.deleteMessage(m.messageId)).then(() => openChat(active))}>✕</button>}
              </div>
            ))}
            {msgs.length === 0 && <div className="text-xs opacity-40">сообщений нет</div>}
          </div>
          <div className="flex gap-2 items-center">
            <Input placeholder="сообщение…" value={text} onChange={(e) => setText(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === "Enter" && send()} />
            <label className="cursor-pointer text-lg">📎<input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <Btn onClick={send}>➤</Btn>
          </div>
          {file && <div className="text-xs opacity-60">файл: {file.name}</div>}
        </Card>
      )}
    </div>
  );
}

// ── create ───────────────────────────────────────────────────────────────────

function CreateView() {
  const { run } = useLog();
  const [title, setTitle] = useState("Мой пост");
  const [content, setContent] = useState("");
  const [imgs, setImgs] = useState<File[]>([]);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPostId, setStoryPostId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <Card title="Новый пост">
        <Input placeholder="заголовок" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextArea placeholder="описание" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
        <input type="file" accept="image/*" multiple onChange={(e) => setImgs(Array.from(e.target.files ?? []))} className="text-sm" />
        <Btn disabled={!imgs.length} onClick={() => run("add-post", () => postApi.addPost({ title, content, images: imgs }))}>Опубликовать {imgs.length ? `(${imgs.length})` : ""}</Btn>
      </Card>
      <Card title="Новая сторис">
        <input type="file" accept="image/*" onChange={(e) => setStoryFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <Input placeholder="postId (необязательно)" value={storyPostId} onChange={(e) => setStoryPostId(e.target.value)} />
        <Btn disabled={!storyFile} onClick={() => storyFile && run("AddStories", () => storyApi.addStory(storyFile, storyPostId ? Number(storyPostId) : undefined))}>Добавить сторис</Btn>
      </Card>
    </div>
  );
}

// ── profile ──────────────────────────────────────────────────────────────────

function ProfileView({ myId, openPost, openUser }: { myId?: string; openPost: (id: number) => void; openUser: (id: string) => void }) {
  const { run } = useLog();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [favs, setFavs] = useState<Post[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [subers, setSubers] = useState<Subscriber[]>([]);
  const [about, setAbout] = useState("");
  const [gender, setGender] = useState(0);
  const [showList, setShowList] = useState<"followers" | "following" | null>(null);
  const [view, setView] = useState<"posts" | "favs">("posts");

  const loadAll = useCallback(() => {
    run("get-my-profile", () => userProfileApi.getMyProfile()).then((r) => { setMe(r.data); setAbout(r.data.about ?? ""); }).catch(() => {});
    run("get-my-posts", () => postApi.getMyPosts()).then((r) => setPosts((Array.isArray(r.data) ? r.data : []) as Post[])).catch(() => {});
    run("get-post-favorites", () => userProfileApi.getPostFavorites({ pageNumber: 1, pageSize: 18 })).then((r) => setFavs(r.data)).catch(() => {});
    if (myId) {
      run("get-subscribers", () => followingApi.getSubscribers(myId)).then((r) => setSubers(r.data)).catch(() => {});
      run("get-subscriptions", () => followingApi.getSubscriptions(myId)).then((r) => setSubs(r.data)).catch(() => {});
    }
  }, [run, myId]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const list = showList === "followers" ? subers : subs;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer relative">
            <Avatar src={me?.image} name={me?.userName} size={72} />
            <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) run("update-avatar", () => userProfileApi.updateUserImageProfile(f)).then(loadAll); }} />
          </label>
          <div className="text-sm">
            <div className="text-lg font-bold">@{me?.userName}</div>
            <div className="flex gap-4 mt-1">
              <span><b>{me?.postCount ?? posts.length}</b> постов</span>
              <button onClick={() => setShowList("followers")}><b>{me?.subscribersCount ?? 0}</b> подписч.</button>
              <button onClick={() => setShowList("following")}><b>{me?.subscriptionsCount ?? 0}</b> подписок</button>
            </div>
            <div className="opacity-70 mt-1">{me?.firstName} {me?.lastName} · {me?.gender}</div>
            <div className="opacity-70">{me?.about}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="о себе" value={about} onChange={(e) => setAbout(e.target.value)} className="flex-1" />
          <select value={gender} onChange={(e) => setGender(Number(e.target.value))} className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-2 text-sm">
            <option value={0}>М</option>
            <option value={1}>Ж</option>
          </select>
          <Btn onClick={() => run("update-user-profile", () => userProfileApi.updateUserProfile({ about, gender })).then(loadAll)}>Сохранить</Btn>
          <Btn variant="ghost" onClick={() => run("delete-avatar", () => userProfileApi.deleteUserImageProfile()).then(loadAll)}>Удалить аватар</Btn>
        </div>
        <div className="text-[11px] opacity-40 break-all">myId: {myId}</div>
      </Card>

      <div className="flex gap-2 justify-center text-sm">
        <button onClick={() => setView("posts")} className={view === "posts" ? "font-bold underline" : "opacity-60"}>▦ Посты</button>
        <button onClick={() => setView("favs")} className={view === "favs" ? "font-bold underline" : "opacity-60"}>🔖 Избранное</button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(view === "posts" ? posts : favs).map((p) => <PostThumb key={p.postId} post={p} onClick={() => openPost(p.postId)} />)}
      </div>

      {showList && (
        <Modal onClose={() => setShowList(null)}>
          <div className="p-4 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
            <div className="font-semibold">{showList === "followers" ? "Подписчики" : "Подписки"}</div>
            {list.map((s) => (
              <button key={s.id} onClick={() => { openUser(s.userShortInfo.userId); setShowList(null); }} className="flex items-center gap-2 text-sm">
                <Avatar src={s.userShortInfo.userPhoto} name={s.userShortInfo.userName} size={30} />
                <span className="font-medium">@{s.userShortInfo.userName}</span>
                <span className="opacity-60">{s.userShortInfo.fullname}</span>
              </button>
            ))}
            {list.length === 0 && <div className="text-xs opacity-40">пусто</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── чужой профиль ─────────────────────────────────────────────────────────────

function UserProfileModal({ userId, myId, onClose, openPost }: { userId: string; myId?: string; onClose: () => void; openPost: (id: number) => void }) {
  const { run } = useLog();
  const [prof, setProf] = useState<UserProfile | null>(null);
  const [isFollow, setIsFollow] = useState<boolean | null>(null);

  const load = useCallback(() => {
    run("get-user-profile-by-id", () => userProfileApi.getUserProfileById(userId)).then((r) => setProf(r.data)).catch(() => {});
    run("get-is-follow", () => userProfileApi.getIsFollowUserProfileById(userId)).then((r) => setIsFollow(Boolean(r.data))).catch(() => {});
  }, [run, userId]);
  useEffect(() => { load(); }, [load]);

  return (
    <Modal onClose={onClose}>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={prof?.image} name={prof?.userName} size={60} />
          <div className="text-sm">
            <div className="text-lg font-bold">@{prof?.userName ?? userId.slice(0, 8)}</div>
            <div className="opacity-70">{prof?.firstName} {prof?.lastName}</div>
            <div className="flex gap-3 mt-1">
              <span><b>{prof?.postCount ?? 0}</b> постов</span>
              <span><b>{prof?.subscribersCount ?? 0}</b> подпис.</span>
            </div>
          </div>
          <button onClick={onClose} className="ml-auto text-xl">×</button>
        </div>
        <div className="opacity-70 text-sm">{prof?.about}</div>
        {userId !== myId && (
          isFollow ? (
            <Btn variant="ghost" onClick={() => run("unfollow", () => followingApi.unfollow(userId)).then(load)}>Отписаться</Btn>
          ) : (
            <Btn onClick={() => run("follow", () => followingApi.follow(userId)).then(load)}>Подписаться</Btn>
          )
        )}
        <div className="text-[11px] opacity-40 break-all">userId: {userId}</div>
      </div>
    </Modal>
  );
}

// ── locations ─────────────────────────────────────────────────────────────────

function LocationsView() {
  const { run } = useLog();
  const [list, setList] = useState<Location[]>([]);
  const [form, setForm] = useState<Location>({ locationId: 0, city: "", state: "", zipCode: "", country: "" });
  const set = (k: keyof Location, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const load = () => run("get-Locations", () => locationApi.getLocations({ pageNumber: 1, pageSize: 20 })).then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card title={form.locationId ? `Редактирование #${form.locationId}` : "Новая локация"}>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          <Input placeholder="state" value={form.state} onChange={(e) => set("state", e.target.value)} />
          <Input placeholder="zipCode" value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} />
          <Input placeholder="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div className="flex gap-2">
          {form.locationId ? (
            <>
              <Btn onClick={() => run("update-Location", () => locationApi.updateLocation(form)).then(load)}>Обновить</Btn>
              <Btn variant="ghost" onClick={() => setForm({ locationId: 0, city: "", state: "", zipCode: "", country: "" })}>Отмена</Btn>
            </>
          ) : (
            <Btn onClick={() => run("add-Location", () => locationApi.addLocation(form)).then(load)}>Добавить</Btn>
          )}
        </div>
        <div className="text-[11px] opacity-40">⚠ update-Location на сервере пока падает (баг AutoMapper на бэке).</div>
      </Card>

      <Card title="Список" right={<Btn variant="ghost" onClick={load}>Обновить</Btn>}>
        {list.map((l) => (
          <div key={l.locationId} className="flex items-center gap-2 text-sm border-b border-black/5 dark:border-white/10 py-1">
            <span className="opacity-40">#{l.locationId}</span>
            <span>{[l.city, l.state, l.country].filter(Boolean).join(", ") || "—"}</span>
            <button className="ml-auto text-xs opacity-60" onClick={() => run("get-Location-by-id", () => locationApi.getLocationById(l.locationId))}>инфо</button>
            <button className="text-xs" onClick={() => setForm(l)}>ред.</button>
            <button className="text-xs text-red-500" onClick={() => run("delete-Location", () => locationApi.deleteLocation(l.locationId)).then(load)}>удал.</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── account ──────────────────────────────────────────────────────────────────

function AccountView({ myId, onLogout }: { myId?: string; onLogout: () => void }) {
  const { run } = useLog();
  const [pw, setPw] = useState({ old: "Qwerty123!", neu: "Qwerty456!" });
  const [email, setEmail] = useState("");
  const [reset, setReset] = useState({ token: "", email: "", password: "" });

  return (
    <div className="flex flex-col gap-4">
      <Card title="Сменить пароль">
        <Input placeholder="старый пароль" value={pw.old} onChange={(e) => setPw((s) => ({ ...s, old: e.target.value }))} />
        <Input placeholder="новый пароль" value={pw.neu} onChange={(e) => setPw((s) => ({ ...s, neu: e.target.value }))} />
        <Btn onClick={() => run("ChangePassword", () => accountApi.changePassword({ oldPassword: pw.old, password: pw.neu, confirmPassword: pw.neu }))}>Сменить</Btn>
      </Card>
      <Card title="Забыл пароль / сброс">
        <div className="flex gap-2">
          <Input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
          <Btn variant="ghost" onClick={() => run("ForgotPassword", () => accountApi.forgotPassword(email))}>Прислать токен</Btn>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="token из письма" value={reset.token} onChange={(e) => setReset((s) => ({ ...s, token: e.target.value }))} />
          <Input placeholder="email" value={reset.email} onChange={(e) => setReset((s) => ({ ...s, email: e.target.value }))} />
          <Input placeholder="новый пароль" value={reset.password} onChange={(e) => setReset((s) => ({ ...s, password: e.target.value }))} className="col-span-2" />
        </div>
        <Btn variant="ghost" onClick={() => run("ResetPassword", () => accountApi.resetPassword({ ...reset, confirmPassword: reset.password }))}>Сбросить пароль</Btn>
      </Card>
      <Card title="Опасная зона">
        <Btn variant="danger" onClick={() => { authToken.clearToken(); onLogout(); }}>Выйти</Btn>
        <Btn variant="danger" onClick={() => { if (myId && confirm("Удалить аккаунт?")) run("delete-user", () => userApi.deleteUser(myId)).then(() => { authToken.clearToken(); onLogout(); }); }}>Удалить аккаунт</Btn>
      </Card>
    </div>
  );
}
