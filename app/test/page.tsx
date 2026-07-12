"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  accountApi,
  postApi,
  userApi,
  storyApi,
  userProfileApi,
  followingApi,
  authToken,
  mediaUrl,
  ApiError,
  type Post,
  type User,
  type UserProfile,
} from "@/lib/api";
import type { StoryGroup } from "@/lib/api/story";

// ── мелкие ui-хелперы ────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">{title}</h2>
      {children}
    </section>
  );
}

function Btn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={
        "rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium " +
        "disabled:opacity-40 hover:opacity-90 transition " +
        (p.className ?? "")
      }
    />
  );
}

function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={
        "rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm " +
        (p.className ?? "")
      }
    />
  );
}

// ── страница ─────────────────────────────────────────────────────────────────

export default function TestPage() {
  const [authed, setAuthed] = useState(false);
  const [log, setLog] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setAuthed(authToken.isAuthenticated()), []);

  const call = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    try {
      const r = await fn();
      setLog({ ok: true, text: `✅ ${label}\n` + JSON.stringify(r, null, 2).slice(0, 1200) });
      return r;
    } catch (e) {
      const msg = e instanceof ApiError ? `[${e.status}] ${e.errors.join("; ") || e.message}` : String(e);
      setLog({ ok: false, text: `❌ ${label}\n${msg}` });
      throw e;
    }
  }, []);

  return (
    <div className="min-h-screen w-full max-w-3xl mx-auto p-5 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">API playground</h1>
        <span
          className={
            "text-xs px-2 py-1 rounded-full " +
            (authed ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600")
          }
        >
          {authed ? "авторизован" : "не авторизован"}
        </span>
      </header>

      {!authed ? (
        <AuthPanel call={call} onAuthed={() => setAuthed(true)} />
      ) : (
        <>
          <div className="flex justify-end">
            <Btn
              onClick={() => {
                authToken.clearToken();
                setAuthed(false);
                setLog(null);
              }}
              className="bg-red-600"
            >
              Выйти
            </Btn>
          </div>
          <ProfilePanel call={call} />
          <CreatePostPanel call={call} />
          <FeedPanel call={call} />
          <UsersPanel call={call} />
          <StoriesPanel call={call} />
        </>
      )}

      {log && (
        <pre
          className={
            "whitespace-pre-wrap text-xs rounded-xl border p-3 overflow-x-auto " +
            (log.ok ? "border-green-500/40" : "border-red-500/40")
          }
        >
          {log.text}
        </pre>
      )}
    </div>
  );
}

type CallFn = (label: string, fn: () => Promise<unknown>) => Promise<unknown>;

// ── auth ─────────────────────────────────────────────────────────────────────

function AuthPanel({ call, onAuthed }: { call: CallFn; onAuthed: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [f, setF] = useState({ userName: "", fullName: "", email: "", password: "Qwerty123!" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const suggest = () => {
    const n = "user" + Math.floor(Math.random() * 100000);
    setF({ userName: n, fullName: "Test " + n, email: n + "@mail.com", password: "Qwerty123!" });
  };

  return (
    <Card title="Аккаунт">
      <div className="flex gap-2 text-sm">
        <button onClick={() => setTab("register")} className={tab === "register" ? "font-bold underline" : "opacity-60"}>
          Регистрация
        </button>
        <button onClick={() => setTab("login")} className={tab === "login" ? "font-bold underline" : "opacity-60"}>
          Вход
        </button>
        <button onClick={suggest} className="ml-auto text-xs opacity-60 underline">
          сгенерить тестового
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="userName" value={f.userName} onChange={(e) => set("userName", e.target.value)} />
        <Input placeholder="password" value={f.password} onChange={(e) => set("password", e.target.value)} />
        {tab === "register" && (
          <>
            <Input placeholder="fullName" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />
            <Input placeholder="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </>
        )}
      </div>
      <div className="flex gap-2">
        {tab === "register" && (
          <Btn
            onClick={() =>
              call("register", () =>
                accountApi.register({
                  userName: f.userName,
                  fullName: f.fullName,
                  email: f.email,
                  password: f.password,
                  confirmPassword: f.password,
                }),
              )
            }
          >
            Зарегистрировать
          </Btn>
        )}
        <Btn
          onClick={async () => {
            await call("login", () => accountApi.login({ userName: f.userName, password: f.password }));
            onAuthed();
          }}
        >
          Войти
        </Btn>
      </div>
    </Card>
  );
}

// ── profile ──────────────────────────────────────────────────────────────────

function ProfilePanel({ call }: { call: CallFn }) {
  const [me, setMe] = useState<UserProfile | null>(null);
  return (
    <Card title="Мой профиль">
      <div className="flex gap-2 flex-wrap">
        <Btn onClick={async () => setMe(((await call("get-my-profile", () => userProfileApi.getMyProfile())) as { data: UserProfile }).data)}>
          Загрузить профиль
        </Btn>
        <Btn onClick={() => call("update-user-profile", () => userProfileApi.updateUserProfile({ about: "Привет из плейграунда", gender: 1 }))}>
          Обновить «о себе»
        </Btn>
        <label className="rounded-lg border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm cursor-pointer">
          Сменить аватар
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) call("update-avatar", () => userProfileApi.updateUserImageProfile(file));
            }}
          />
        </label>
      </div>
      {me && (
        <div className="flex items-center gap-3 text-sm">
          {me.image ? <img src={mediaUrl(me.image)} className="w-12 h-12 rounded-full object-cover" alt="" /> : null}
          <div>
            <div className="font-semibold">{me.userName}</div>
            <div className="opacity-60">
              постов: {me.postCount ?? 0} · подписчиков: {me.subscribersCount ?? 0} · подписок: {me.subscriptionsCount ?? 0}
            </div>
            <div className="opacity-60">{me.about}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── create post ──────────────────────────────────────────────────────────────

function CreatePostPanel({ call }: { call: CallFn }) {
  const [title, setTitle] = useState("Мой пост");
  const [content, setContent] = useState("описание");
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Card title="Создать пост">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="content" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm" />
      <Btn
        disabled={files.length === 0}
        onClick={() => call("add-post", () => postApi.addPost({ title, content, images: files }))}
      >
        Опубликовать {files.length ? `(${files.length} фото)` : ""}
      </Btn>
    </Card>
  );
}

// ── feed ─────────────────────────────────────────────────────────────────────

function FeedPanel({ call }: { call: CallFn }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const load = async () => {
    const r = (await call("get-posts", () => postApi.getPosts({ pageNumber: 1, pageSize: 6 }))) as { data: Post[] };
    setPosts(r.data);
  };
  return (
    <Card title="Лента постов">
      <Btn onClick={load} className="self-start">
        Загрузить ленту
      </Btn>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {posts.map((p) => (
          <div key={p.postId} className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
            {p.images?.[0] && /\.(png|jpe?g|gif|webp)$/i.test(p.images[0]) ? (
              <img src={mediaUrl(p.images[0])} className="w-full aspect-square object-cover" alt={p.title} />
            ) : (
              <div className="w-full aspect-square grid place-items-center text-xs opacity-50">нет фото</div>
            )}
            <div className="p-2 text-xs">
              <div className="font-semibold truncate">@{p.userName}</div>
              <div className="truncate opacity-70">{p.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={async () => {
                    await call("like-post", () => postApi.likePost(p.postId));
                    load();
                  }}
                >
                  {p.postLike ? "❤️" : "🤍"} {p.postLikeCount}
                </button>
                <span className="opacity-60">👁 {p.postView}</span>
                <span className="opacity-60">💬 {p.commentCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── users ────────────────────────────────────────────────────────────────────

function UsersPanel({ call }: { call: CallFn }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const search = async () => {
    const r = (await call("get-users", () => userApi.getUsers({ userName: q, pageNumber: 1, pageSize: 8 }))) as { data: User[] };
    setUsers(r.data);
  };
  return (
    <Card title="Поиск пользователей">
      <div className="flex gap-2">
        <Input placeholder="userName..." value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        <Btn onClick={search}>Искать</Btn>
      </div>
      <div className="flex flex-col gap-1">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2 text-sm">
            {u.avatar ? <img src={mediaUrl(u.avatar)} className="w-7 h-7 rounded-full object-cover" alt="" /> : <div className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10" />}
            <span className="font-medium">@{u.userName}</span>
            <span className="opacity-60">{u.fullName}</span>
            <Btn className="ml-auto text-xs py-0.5" onClick={() => call("follow", () => followingApi.follow(u.id))}>
              подписаться
            </Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── stories ──────────────────────────────────────────────────────────────────

function StoriesPanel({ call }: { call: CallFn }) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  return (
    <Card title="Сторис">
      <div className="flex gap-2 flex-wrap">
        <Btn onClick={async () => setGroups((await call("get-stories", () => storyApi.getStories())) as StoryGroup[])}>
          Загрузить сторис
        </Btn>
        <label className="rounded-lg border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm cursor-pointer">
          Добавить сторис
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) call("AddStories", () => storyApi.addStory(file));
            }}
          />
        </label>
      </div>
      <div className="flex gap-3 overflow-x-auto">
        {groups.map((g) => (
          <div key={g.userId} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-14 h-14 rounded-full ring-2 ring-pink-500 grid place-items-center overflow-hidden">
              {g.userImage ? <img src={mediaUrl(g.userImage)} className="w-full h-full object-cover" alt="" /> : <span className="text-lg">📷</span>}
            </div>
            <span className="text-[11px] truncate max-w-14">{g.userName}</span>
            <span className="text-[10px] opacity-50">{g.stories.length} шт.</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
