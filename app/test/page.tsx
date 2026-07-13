"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  accountApi, userApi, userProfileApi, postApi, storyApi, chatApi, followingApi, locationApi,
  authToken, getCurrentUser, ApiError, type Post, type Reel, type User, type UserProfile,
  type Subscriber, type ChatSummary, type ChatMessage, type Location, type CurrentUser,
} from "@/lib/api";
import { LogProvider, LogDrawer, useLog, useResource, prefetch, Btn, Input, TextArea, Card, Avatar, Modal, Icon } from "./ui";
import { PostModal, StoryViewer, PostThumb, Media } from "./components";
import { AutoReel, CallModal, IncomingCallWatcher, EmojiButton, ReactionBar } from "./features";

type Tab = "home" | "explore" | "reels" | "search" | "messages" | "create" | "profile" | "locations" | "account";

/** Короткое относительное время в стиле IG (5 мин., 3 ч., 2 дн.). */
function relTime(iso?: string) {
  if (!iso) return "";
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)} с.`;
  if (s < 3600) return `${Math.floor(s / 60)} мин.`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч.`;
  if (s < 604800) return `${Math.floor(s / 86400)} дн.`;
  return `${Math.floor(s / 604800)} нед.`;
}

// Загрузчики с общими ключами кэша — используются и во вкладках, и в префетче.
const FEED_LOAD = () => postApi.getPosts({ pageNumber: 1, pageSize: 8 });
const EXPLORE_LOAD = () => postApi.getPosts({ pageNumber: 1, pageSize: 21 });
const REELS_LOAD = () => postApi.getReels({ pageNumber: 1, pageSize: 6 });
const STORIES_LOAD = () => storyApi.getStories();

const NAV: { key: Tab; icon: string; label: string }[] = [
  { key: "home", icon: "home", label: "Главная" },
  { key: "explore", icon: "explore", label: "Интересное" },
  { key: "reels", icon: "reels", label: "Reels" },
  { key: "search", icon: "search", label: "Поиск" },
  { key: "messages", icon: "message", label: "Сообщения" },
  { key: "create", icon: "create", label: "Создать" },
  { key: "profile", icon: "profile", label: "Профиль" },
  { key: "locations", icon: "pin", label: "Локации" },
  { key: "account", icon: "settings", label: "Аккаунт" },
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
  const [callWith, setCallWith] = useState<{ id: string; name: string } | null>(null);

  const refresh = useCallback(() => {
    setAuthed(authToken.isAuthenticated());
    setMe(getCurrentUser());
  }, []);
  // Токен доступен только на клиенте — читаем его после монтирования,
  // чтобы SSR и первый клиентский рендер совпали (иначе рассинхрон гидрации).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => refresh(), [refresh]);

  // Основной API иногда отдаёт 500 (напр. флаки get-posts). Такие ошибки уже
  // видны в логе запросов — глушим необработанные ApiError, чтобы они не
  // показывались красным оверлеем поверх приложения.
  useEffect(() => {
    const onReject = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof ApiError) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, []);

  // Фоновый префетч: пока смотришь главную, «Интересное»/«Reels» уже грузятся
  // в кэш — при переходе появляются мгновенно.
  useEffect(() => {
    if (!authed) return;
    prefetch("feed", FEED_LOAD);
    prefetch("stories", STORIES_LOAD);
    prefetch("explore", EXPLORE_LOAD);
    prefetch("reels", REELS_LOAD);
  }, [authed]);

  if (!authed) return <AuthScreen onAuthed={refresh} />;

  const ctx = { myId: me?.userId, openPost: setOpenPost, openStory: setOpenStory, openUser: setOpenUser };
  const wide = tab === "explore" || tab === "profile";

  const bottomKeys: Tab[] = ["home", "search", "reels", "explore", "profile"];
  const topKeys: Tab[] = ["messages", "create", "locations", "account"];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-[#262626] dark:text-[#f5f5f5] md:flex">
      {/* десктопный сайдбар */}
      <nav className="hidden md:flex sticky top-0 h-screen w-[72px] xl:w-[245px] shrink-0 border-r border-[#dbdbdb] dark:border-[#262626] px-3 py-5 flex-col">
        <div className="px-2.5 mb-6 h-10 flex items-center">
          <span className="hidden xl:block text-2xl" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>Instagram</span>
          <span className="xl:hidden"><Icon name="reels" size={26} /></span>
        </div>
        <div className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)} title={n.label}
                className={"flex items-center gap-4 rounded-lg px-3 py-3 text-left transition hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] active:opacity-60 " + (active ? "font-bold" : "font-normal")}>
                <Icon name={n.icon} size={26} fill={active} />
                <span className="hidden xl:inline text-[16px] leading-none">{n.label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => setTab("profile")} className="mt-auto flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition">
          <Avatar name={me?.userName} size={26} />
          <span className="hidden xl:inline text-[15px] truncate">{me?.userName}</span>
        </button>
      </nav>

      {/* мобильный верхний бар */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-12 px-4 flex items-center bg-white/95 dark:bg-black/95 backdrop-blur border-b border-[#dbdbdb] dark:border-[#262626]">
        <span className="text-xl" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>Instagram</span>
        <div className="ml-auto flex items-center gap-5">
          {topKeys.map((k) => {
            const n = NAV.find((x) => x.key === k)!;
            return <button key={k} onClick={() => setTab(k)} title={n.label}><Icon name={n.icon} size={24} fill={tab === k} /></button>;
          })}
        </div>
      </header>

      {/* контент */}
      <main className={"flex-1 w-full mx-auto px-2 sm:px-4 pt-16 md:pt-6 pb-24 md:pb-[45vh] " + (wide ? "max-w-[935px]" : "max-w-[470px]")}>
        {tab === "home" && <HomeView {...ctx} />}
        {tab === "explore" && <ExploreView {...ctx} />}
        {tab === "reels" && <ReelsView {...ctx} />}
        {tab === "search" && <SearchView {...ctx} />}
        {tab === "messages" && <MessagesView myId={me?.userId} openUser={setOpenUser} startCall={setCallWith} />}
        {tab === "create" && <CreateView />}
        {tab === "profile" && <ProfileView myId={me?.userId} openPost={setOpenPost} openUser={setOpenUser} />}
        {tab === "locations" && <LocationsView />}
        {tab === "account" && <AccountView myId={me?.userId} onLogout={refresh} />}
      </main>

      {/* мобильная нижняя навигация */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 flex items-center justify-around bg-white dark:bg-black border-t border-[#dbdbdb] dark:border-[#262626]">
        {bottomKeys.map((k) => {
          const n = NAV.find((x) => x.key === k)!;
          if (k === "profile") return <button key={k} onClick={() => setTab(k)}><span className={"block rounded-full " + (tab === k ? "ring-2 ring-current p-[1px]" : "")}><Avatar name={me?.userName} size={26} /></span></button>;
          return <button key={k} onClick={() => setTab(k)} title={n.label}><Icon name={n.icon} size={26} fill={tab === k} /></button>;
        })}
      </nav>

      {openPost != null && <PostModal postId={openPost} myId={me?.userId} onClose={() => setOpenPost(null)} />}
      {openStory != null && <StoryViewer storyId={openStory} myId={me?.userId} onClose={() => setOpenStory(null)} />}
      {openUser != null && <UserProfileModal userId={openUser} myId={me?.userId} onClose={() => setOpenUser(null)} startCall={setCallWith} />}
      {callWith && me && <CallModal me={me} peerId={callWith.id} peerName={callWith.name} onClose={() => setCallWith(null)} />}
      {me && <IncomingCallWatcher me={me} />}
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

  const submit = () => {
    if (tab === "register")
      run("register", () => accountApi.register({ userName: f.userName, fullName: f.fullName, email: f.email, password: f.password, confirmPassword: f.password }))
        .then(() => run("login", () => accountApi.login({ userName: f.userName, password: f.password })).then(onAuthed))
        .catch(() => {});
    else run("login", () => accountApi.login({ userName: f.userName, password: f.password })).then(onAuthed).catch(() => {});
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-white dark:bg-black text-[#262626] dark:text-[#f5f5f5]">
      <div className="w-full max-w-[350px] flex flex-col gap-3">
        <div className="border border-[#dbdbdb] dark:border-[#262626] rounded-lg px-10 py-8 flex flex-col items-center gap-5">
          <div className="text-4xl mt-2 mb-3" style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}>Instagram</div>
          <div className="w-full flex flex-col gap-1.5">
            <input className="w-full rounded border border-[#dbdbdb] dark:border-[#363636] bg-[#fafafa] dark:bg-[#121212] px-2.5 py-2.5 text-xs outline-none focus:border-[#a8a8a8]" placeholder="Имя пользователя" value={f.userName} onChange={(e) => set("userName", e.target.value)} />
            {tab === "register" && <input className="w-full rounded border border-[#dbdbdb] dark:border-[#363636] bg-[#fafafa] dark:bg-[#121212] px-2.5 py-2.5 text-xs outline-none focus:border-[#a8a8a8]" placeholder="Имя" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />}
            {tab === "register" && <input className="w-full rounded border border-[#dbdbdb] dark:border-[#363636] bg-[#fafafa] dark:bg-[#121212] px-2.5 py-2.5 text-xs outline-none focus:border-[#a8a8a8]" placeholder="Эл. адрес" value={f.email} onChange={(e) => set("email", e.target.value)} />}
            <input className="w-full rounded border border-[#dbdbdb] dark:border-[#363636] bg-[#fafafa] dark:bg-[#121212] px-2.5 py-2.5 text-xs outline-none focus:border-[#a8a8a8]" placeholder="Пароль" value={f.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <button onClick={submit} className="w-full rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold py-1.5 transition">
            {tab === "register" ? "Зарегистрироваться" : "Войти"}
          </button>
          <button onClick={suggest} className="text-xs text-[#0095f6] font-semibold">Сгенерировать тестовые данные</button>
        </div>
        <div className="border border-[#dbdbdb] dark:border-[#262626] rounded-lg py-5 text-center text-sm">
          {tab === "register" ? "Есть аккаунт? " : "Нет аккаунта? "}
          <button onClick={() => setTab(tab === "register" ? "login" : "register")} className="text-[#0095f6] font-semibold">
            {tab === "register" ? "Вход" : "Регистрация"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── home: сторис + лента ──────────────────────────────────────────────────────

function StoryRing({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block p-[2px] rounded-full bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]">
      <span className="block p-[2px] bg-white dark:bg-black rounded-full">{children}</span>
    </span>
  );
}

function CommentBox({ postId, onDone }: { postId: number; onDone: () => void }) {
  const { run } = useLog();
  const [text, setText] = useState("");
  return (
    <form
      className="flex items-center gap-2 border-t border-[#efefef] dark:border-[#1a1a1a] pt-2.5 mt-1"
      onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; run("add-comment", () => postApi.addComment({ comment: text, postId })).then(() => { setText(""); onDone(); }); }}
    >
      <EmojiButton onPick={(em) => setText((t) => t + em)} />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Добавьте комментарий…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#8e8e8e]" />
      <button type="submit" disabled={!text.trim()} className="text-sm font-semibold text-[#0095f6] disabled:opacity-40">Опубликовать</button>
    </form>
  );
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="mb-6 animate-pulse">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10" />
            <div className="h-3 w-24 rounded bg-black/10 dark:bg-white/10" />
          </div>
          <div className="w-full aspect-square rounded-sm bg-black/10 dark:bg-white/10" />
        </div>
      ))}
    </>
  );
}

function HomeView({ openPost, openStory, openUser }: Ctx) {
  const { run } = useLog();
  const stories = useResource("stories", () => run("get-stories", STORIES_LOAD));
  const feed = useResource("feed", () => run("get-posts", FEED_LOAD));
  const groups = stories.data ?? [];
  const posts = feed.data?.data ?? [];

  // Оптимистичный патч поста (в state и в кэше). Сам лайк/избранное шлём в
  // фоне: like-post и add-post-favorite на бэке — переключатели (повторный
  // вызов снимает). Не перезапрашиваем ленту (get-posts иногда отдаёт 500).
  const patch = (postId: number, upd: (p: Post) => Post) =>
    feed.mutate((prev) => (prev ? { ...prev, data: prev.data.map((x) => (x.postId === postId ? upd(x) : x)) } : prev));

  const toggleLike = (p: Post) => {
    const willUnlike = p.postLike;
    patch(p.postId, (x) => ({ ...x, postLike: !x.postLike, postLikeCount: Math.max(0, x.postLikeCount + (x.postLike ? -1 : 1)) }));
    run(willUnlike ? "снять лайк (like-post)" : "лайк (like-post)", () => postApi.likePost(p.postId)).catch(() => {});
  };
  const toggleFav = (p: Post) => {
    const willRemove = p.postFavorite;
    patch(p.postId, (x) => ({ ...x, postFavorite: !x.postFavorite }));
    run(willRemove ? "убрать из избранного" : "в избранное", () => postApi.addPostFavorite({ postId: p.postId })).catch(() => {});
  };

  return (
    <div className="flex flex-col">
      {/* сторис */}
      {groups.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-2 border-b border-[#dbdbdb] dark:border-[#262626] no-scrollbar">
          {groups.map((g) => (
            <button key={g.userId} onClick={() => (g.stories[0] ? openStory(g.stories[0].id) : openUser(g.userId))} className="flex flex-col items-center gap-1 shrink-0 w-16">
              <StoryRing>
                <Avatar src={g.userImage} name={g.userName} size={56} />
              </StoryRing>
              <span className="text-[11px] truncate max-w-16 w-full">{g.userName}</span>
            </button>
          ))}
        </div>
      )}

      {/* лента */}
      {feed.loading && posts.length === 0 && <FeedSkeleton />}
      {posts.map((p) => (
        <article key={p.postId} className="mb-4">
          <div className="flex items-center gap-2.5 py-2">
            <button onClick={() => openUser(p.userId)}>
              <StoryRing><Avatar src={p.userImage} name={p.userName ?? ""} size={32} /></StoryRing>
            </button>
            <button onClick={() => openUser(p.userId)} className="text-sm font-semibold">{p.userName}</button>
            <span className="text-[#8e8e8e] text-sm">· {relTime(p.datePublished)}</span>
          </div>
          <button onClick={() => openPost(p.postId)} className="block w-full rounded-sm overflow-hidden border border-[#dbdbdb] dark:border-[#262626]">
            <Media file={Array.isArray(p.images) ? p.images[0] : (p.images as unknown as string)} className="w-full aspect-square object-cover" />
          </button>
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center gap-4">
              <button className={"transition hover:opacity-50 active:scale-90 " + (p.postLike ? "text-[#ed4956]" : "")} onClick={() => toggleLike(p)}>
                <Icon name="heart" size={26} fill={p.postLike} />
              </button>
              <button className="transition hover:opacity-50" onClick={() => openPost(p.postId)}><Icon name="comment" size={26} /></button>
              <button className="ml-auto transition hover:opacity-50 active:scale-90" onClick={() => toggleFav(p)}>
                <Icon name="bookmark" size={26} fill={p.postFavorite} />
              </button>
            </div>
            <div className="text-sm font-semibold">{p.postLikeCount} отметок «Нравится»</div>
            {p.title && <div className="text-sm leading-snug"><b>{p.userName}</b> {p.title}</div>}
            {p.commentCount > 0 && <button onClick={() => openPost(p.postId)} className="text-sm text-[#8e8e8e] text-left">Смотреть все комментарии ({p.commentCount})</button>}
            <ReactionBar postId={p.postId} />
            <CommentBox postId={p.postId} onDone={feed.reload} />
          </div>
        </article>
      ))}
      {!feed.loading && posts.length === 0 && <div className="text-sm text-[#8e8e8e] text-center py-10">Лента пуста</div>}
    </div>
  );
}

// ── explore: сетка ───────────────────────────────────────────────────────────

function ExploreView({ openPost }: Ctx) {
  const { run } = useLog();
  const { data, loading } = useResource("explore", () => run("get-posts (explore)", EXPLORE_LOAD));
  const posts = data?.data ?? [];
  return (
    <div className="grid grid-cols-3 gap-1">
      {loading && posts.length === 0
        ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square bg-black/[.06] dark:bg-white/[.06] animate-pulse" />)
        : posts.map((p) => <PostThumb key={p.postId} post={p} onClick={() => openPost(p.postId)} />)}
    </div>
  );
}

// ── reels ────────────────────────────────────────────────────────────────────

function ReelsView({ openPost }: Ctx) {
  const { run } = useLog();
  const { data, loading, mutate } = useResource("reels", () => run("get-reels", REELS_LOAD));
  const reels = data?.data ?? [];

  const like = (r: Reel) => {
    const willUnlike = r.postLike;
    mutate((prev) => (prev ? { ...prev, data: prev.data.map((x) => (x.postId === r.postId ? { ...x, postLike: !x.postLike, postLikeCount: Math.max(0, x.postLikeCount + (x.postLike ? -1 : 1)) } : x)) } : prev));
    run(willUnlike ? "снять лайк (like-post)" : "лайк (like-post)", () => postApi.likePost(r.postId)).catch(() => {});
  };

  return (
    <div className="flex flex-col items-center gap-4 h-[calc(100vh-8rem)] overflow-y-auto snap-y snap-mandatory no-scrollbar">
      {loading && reels.length === 0 && <div className="w-full max-w-[380px] aspect-[9/16] rounded-xl bg-black/[.06] dark:bg-white/[.06] animate-pulse" />}
      {reels.map((r) => (
        <AutoReel
          key={r.postId}
          reel={r}
          onLike={() => like(r)}
          onComments={() => openPost(r.postId)}
          onFollow={() => run("follow", () => followingApi.follow(r.userId)).catch(() => {})}
        />
      ))}
      {!loading && reels.length === 0 && <div className="text-sm text-[#8e8e8e] py-10">Reels нет</div>}
    </div>
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

function MessagesView({ myId, startCall }: { myId?: string; openUser: (id: string) => void; startCall: (p: { id: string; name: string }) => void }) {
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
  const other = (c: ChatSummary) =>
    c.sendUserId === myId
      ? { id: c.receiveUserId, name: c.receiveUserName, img: c.receiveUserImage }
      : { id: c.sendUserId, name: c.sendUserName, img: c.sendUserImage };
  const activePeer = active != null ? (() => { const c = chats.find((x) => x.chatId === active); return c ? other(c) : null; })() : null;

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
        <Card
          title={activePeer ? activePeer.name : `Чат #${active}`}
          right={activePeer && (
            <div className="flex items-center gap-3">
              <button title="Аудиозвонок" className="hover:opacity-60 transition" onClick={() => startCall({ id: activePeer.id, name: activePeer.name })}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z" /></svg>
              </button>
              <button title="Видеозвонок" className="hover:opacity-60 transition" onClick={() => startCall({ id: activePeer.id, name: activePeer.name })}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="13" height="12" rx="2" /><path d="m22 8-5 4 5 4z" /></svg>
              </button>
            </div>
          )}
        >
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {msgs.map((m) => (
              <div key={m.messageId} className={"flex gap-2 items-end group " + (m.userId === myId ? "flex-row-reverse" : "")}>
                <Avatar src={m.userImage} name={m.userName} size={24} />
                <div className={"rounded-2xl px-3.5 py-2 text-sm max-w-[70%] " + (m.userId === myId ? "bg-[#0095f6] text-white" : "bg-black/[.06] dark:bg-white/[.1]")}>
                  {m.messageText}
                  {m.file && <Media file={m.file} className="mt-1 rounded-lg max-h-40" />}
                </div>
                {m.userId === myId && <button className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition text-[#ed4956]" title="Удалить" onClick={() => run("delete-message", () => chatApi.deleteMessage(m.messageId)).then(() => openChat(active))}><Icon name="trash" size={15} /></button>}
              </div>
            ))}
            {msgs.length === 0 && <div className="text-xs opacity-40">сообщений нет</div>}
          </div>
          <div className="flex gap-2 items-center">
            <EmojiButton onPick={(em) => setText((t) => t + em)} />
            <Input placeholder="Сообщение…" value={text} onChange={(e) => setText(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === "Enter" && send()} />
            <label className="cursor-pointer opacity-60 hover:opacity-100 transition" title="Прикрепить файл"><Icon name="attach" size={20} /><input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <Btn onClick={send}><Icon name="send" size={16} /></Btn>
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
  const [edit, setEdit] = useState(false);

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
    <div className="flex flex-col">
      {/* хедер профиля как в веб-инстаграме */}
      <header className="flex items-start gap-6 sm:gap-14 px-2 sm:px-8 pb-8">
        <label className="cursor-pointer relative shrink-0" title="Сменить аватар">
          <div className="w-20 h-20 sm:w-[150px] sm:h-[150px]"><Avatar src={me?.image} name={me?.userName} size={150} /></div>
          <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) run("update-avatar", () => userProfileApi.updateUserImageProfile(f)).then(loadAll); }} />
        </label>
        <div className="flex flex-col gap-4 min-w-0 pt-1">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-normal">{me?.userName}</h1>
            <button onClick={() => setEdit((v) => !v)} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#efefef] dark:bg-[#363636] hover:opacity-80 transition">Редактировать профиль</button>
            <button onClick={() => run("delete-avatar", () => userProfileApi.deleteUserImageProfile()).then(loadAll)} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#efefef] dark:bg-[#363636] hover:opacity-80 transition">Удалить фото</button>
          </div>
          <div className="flex gap-8 text-sm">
            <span><b>{me?.postCount ?? posts.length}</b> публикаций</span>
            <button onClick={() => setShowList("followers")}><b>{me?.subscribersCount ?? 0}</b> подписчиков</button>
            <button onClick={() => setShowList("following")}><b>{me?.subscriptionsCount ?? 0}</b> подписок</button>
          </div>
          <div className="text-sm">
            <div className="font-semibold">{me?.firstName} {me?.lastName}</div>
            {me?.about && <div className="whitespace-pre-line">{me.about}</div>}
            <div className="text-[#8e8e8e] text-xs mt-0.5 break-all">{me?.gender} · id: {myId?.slice(0, 8)}…</div>
          </div>
          {edit && (
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-[#dbdbdb] dark:border-[#262626] max-w-md">
              <Input placeholder="О себе" value={about} onChange={(e) => setAbout(e.target.value)} />
              <div className="flex items-center gap-2">
                <select value={gender} onChange={(e) => setGender(Number(e.target.value))} className="rounded-lg border border-[#dbdbdb] dark:border-[#363636] bg-transparent px-3 py-2 text-sm">
                  <option value={0}>Мужской</option>
                  <option value={1}>Женский</option>
                </select>
                <Btn onClick={() => run("update-user-profile", () => userProfileApi.updateUserProfile({ about, gender })).then(() => { setEdit(false); loadAll(); })}>Сохранить</Btn>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex justify-center gap-12 text-xs font-semibold uppercase tracking-wide border-t border-[#dbdbdb] dark:border-[#262626]">
        <button onClick={() => setView("posts")} className={"flex items-center gap-1.5 py-3 -mt-px border-t transition " + (view === "posts" ? "border-foreground" : "border-transparent opacity-50")}>
          <Icon name="grid" size={14} /> Посты
        </button>
        <button onClick={() => setView("favs")} className={"flex items-center gap-1.5 py-3 -mt-px border-t transition " + (view === "favs" ? "border-foreground" : "border-transparent opacity-50")}>
          <Icon name="bookmark" size={14} /> Избранное
        </button>
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

function UserProfileModal({ userId, myId, onClose, startCall }: { userId: string; myId?: string; onClose: () => void; startCall: (p: { id: string; name: string }) => void }) {
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
          <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100 transition"><Icon name="x" size={20} /></button>
        </div>
        <div className="opacity-70 text-sm">{prof?.about}</div>
        {userId !== myId && (
          <div className="flex gap-2">
            {isFollow ? (
              <Btn variant="ghost" className="flex-1" onClick={() => run("unfollow", () => followingApi.unfollow(userId)).then(load)}>Отписаться</Btn>
            ) : (
              <Btn className="flex-1" onClick={() => run("follow", () => followingApi.follow(userId)).then(load)}>Подписаться</Btn>
            )}
            <Btn variant="ghost" onClick={() => startCall({ id: userId, name: prof?.userName ?? "user" })} title="Видеозвонок">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="13" height="12" rx="2" /><path d="m22 8-5 4 5 4z" /></svg>
            </Btn>
          </div>
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
        <div className="text-[11px] opacity-40">Локации работают через доп-бэкенд (InstagramExtraApi) — update тоже.</div>
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
