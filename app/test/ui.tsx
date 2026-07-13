"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { mediaUrl, ApiError } from "@/lib/api";

// ── кэш данных + префетч (чтобы вкладки не перезагружались каждый раз) ────────

const _cache = new Map<string, { t: number; v: unknown }>();
const DEFAULT_TTL = 60_000;

/** Заранее прогреть кэш (фоновый префетч). Ошибки глотаем — это не критично. */
export function prefetch<T>(key: string, loader: () => Promise<T>) {
  if (_cache.has(key)) return;
  loader().then((v) => _cache.set(key, { t: Date.now(), v })).catch(() => {});
}

/**
 * Данные с кэшем: при повторном заходе на вкладку показываем из кэша мгновенно,
 * а сеть дёргаем только если данные устарели (TTL). Убирает «долгое появление».
 */
export function useResource<T>(key: string, loader: () => Promise<T>, ttl = DEFAULT_TTL) {
  const [data, setData] = useState<T | undefined>(() => _cache.get(key)?.v as T | undefined);
  const [loading, setLoading] = useState<boolean>(() => !_cache.has(key));

  const reload = useCallback(async () => {
    setLoading(!_cache.has(key));
    try {
      const v = await loader();
      _cache.set(key, { t: Date.now(), v });
      setData(v);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const c = _cache.get(key);
    if (c && Date.now() - c.t < ttl) return; // есть свежий кэш — сеть не трогаем
    // осознанный fetch-эффект: загрузка данных с setState внутри reload
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, reload, setData };
}

// ── иконки (линейные SVG, без эмодзи) ────────────────────────────────────────

const ICONS: Record<string, ReactNode> = {
  home: (<><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>),
  explore: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.1 5-5 2.1 2.1-5z" /></>),
  reels: (<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 8h18M8.5 3 11 8M14 3l2.5 5M10 12.5v3l3-1.5z" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></>),
  message: (<><path d="M22 3 11 14M22 3l-7 18-4-8-8-4z" /></>),
  create: (<><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></>),
  profile: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  pin: (<><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.08a1.65 1.65 0 0 0-2.82-1.17l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.65 1.65 0 0 0 4.6 13H4.5a2 2 0 1 1 0-4h.08a1.65 1.65 0 0 0 1.17-2.82l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.08a1.65 1.65 0 0 0 2.82 1.17l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4z" /></>),
  heart: (<><path d="M12 20.5 4.2 13a4.5 4.5 0 0 1 6.3-6.4l1.5 1.4 1.5-1.4a4.5 4.5 0 0 1 6.3 6.4z" /></>),
  comment: (<><path d="M21 11.5a8 8 0 0 1-11.6 7.1L3 21l1.4-4.3A8 8 0 1 1 21 11.5z" /></>),
  bookmark: (<><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></>),
  share: (<><path d="M22 3 11 14M22 3l-7 18-4-8-8-4z" /></>),
  eye: (<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  attach: (<><path d="M21 12.3 12.7 20.6a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></>),
  trash: (<><path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></>),
  x: (<><path d="M18 6 6 18M6 6l12 12" /></>),
  logout: (<><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 17l-5-5 5-5M5 12h11" /></>),
  refresh: (<><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v5h-5" /></>),
  send: (<><path d="M22 3 11 14M22 3l-7 18-4-8-8-4z" /></>),
};

export function Icon({
  name,
  size = 24,
  fill = false,
  className,
}: {
  name: keyof typeof ICONS | string;
  size?: number;
  fill?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name] ?? null}
    </svg>
  );
}

// ── лог всех запросов ────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  ok: boolean;
  label: string;
  detail: string;
  time: string;
}

interface LogCtx {
  entries: LogEntry[];
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  clear: () => void;
}

const Ctx = createContext<LogCtx | null>(null);
export const useLog = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLog вне LogProvider");
  return c;
};

let seq = 1;

export function LogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const run = useCallback(async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    try {
      const r = await fn();
      setEntries((e) =>
        [{ id: seq++, ok: true, label, detail: JSON.stringify(r, null, 2), time: new Date().toLocaleTimeString() }, ...e].slice(0, 40),
      );
      return r;
    } catch (err) {
      const msg = err instanceof ApiError ? `[${err.status}] ${err.errors.join("; ") || err.message}` : String(err);
      setEntries((e) => [{ id: seq++, ok: false, label, detail: msg, time: new Date().toLocaleTimeString() }, ...e].slice(0, 40));
      throw err;
    }
  }, []);
  const clear = useCallback(() => setEntries([]), []);
  return <Ctx.Provider value={{ entries, run, clear }}>{children}</Ctx.Provider>;
}

/** Нижняя выезжающая панель с логом ответов API. */
export function LogDrawer() {
  const { entries, clear } = useLog();
  const [open, setOpen] = useState(true);
  return (
    <div className="fixed bottom-0 right-0 z-40 w-full sm:w-[430px]">
      <div className="m-3 rounded-2xl border border-black/10 dark:border-white/15 bg-background/90 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/5 dark:border-white/10">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm font-semibold">
            <span className={"transition-transform " + (open ? "rotate-90" : "")}>›</span>
            Лог запросов
            <span className="text-[11px] font-normal opacity-50">{entries.length}</span>
          </button>
          <button onClick={clear} className="ml-auto text-xs opacity-50 hover:opacity-100 transition">
            очистить
          </button>
        </div>
        {open && (
          <div className="max-h-[38vh] overflow-y-auto p-2 flex flex-col gap-1">
            {entries.length === 0 && <div className="text-xs opacity-40 px-2 py-3">пусто — сделай любое действие</div>}
            {entries.map((e) => (
              <details key={e.id} className="rounded-lg hover:bg-black/[.03] dark:hover:bg-white/[.04] text-xs">
                <summary className="cursor-pointer px-2 py-1.5 flex items-center gap-2 list-none">
                  <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (e.ok ? "bg-emerald-500" : "bg-rose-500")} />
                  <span className="font-medium truncate">{e.label}</span>
                  <span className="ml-auto opacity-30 tabular-nums">{e.time}</span>
                </summary>
                <pre className="px-3 pb-2 whitespace-pre-wrap break-all opacity-70 max-h-52 overflow-y-auto font-mono text-[11px]">{e.detail}</pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── примитивы ────────────────────────────────────────────────────────────────

export function Btn({ children, variant, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-40 disabled:pointer-events-none ";
  const styles =
    variant === "ghost"
      ? "border border-black/10 dark:border-white/15 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      : variant === "danger"
        ? "text-rose-600 hover:bg-rose-500/10"
        : "bg-[#0095f6] text-white hover:bg-[#0080d6] active:bg-[#0072c0]";
  return (
    <button {...p} className={base + styles + " " + (p.className ?? "")}>
      {children}
    </button>
  );
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={"rounded-lg border border-black/10 dark:border-white/15 bg-black/[.02] dark:bg-white/[.03] px-3 py-2 text-sm outline-none focus:border-[#0095f6] focus:bg-transparent transition " + (p.className ?? "")}
    />
  );
}

export function TextArea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={"rounded-lg border border-black/10 dark:border-white/15 bg-black/[.02] dark:bg-white/[.03] px-3 py-2 text-sm outline-none focus:border-[#0095f6] focus:bg-transparent transition resize-none " + (p.className ?? "")}
    />
  );
}

export function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/[.07] dark:border-white/[.1] p-5 flex flex-col gap-3.5">
      {(title || right) && (
        <div className="flex items-center">
          {title && <h2 className="text-[13px] font-semibold tracking-tight opacity-80">{title}</h2>}
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Avatar({ src, size = 40, name }: { src?: string | null; size?: number; name?: string }) {
  const s = { width: size, height: size, fontSize: Math.max(10, size * 0.34) };
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name ?? ""} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0 bg-black/5 dark:bg-white/10" />;
  return (
    <div style={s} className="rounded-full shrink-0 grid place-items-center bg-neutral-200 dark:bg-neutral-700 font-semibold text-neutral-500 dark:text-neutral-300">
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className={"bg-background rounded-2xl overflow-hidden max-h-[90vh] w-full shadow-2xl border border-black/10 dark:border-white/10 " + (wide ? "max-w-4xl" : "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : "");
