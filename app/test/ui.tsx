"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { mediaUrl, ApiError } from "@/lib/api";

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
    <div className="fixed bottom-0 right-0 z-40 w-full sm:w-[420px]">
      <div className="m-2 rounded-xl border border-black/15 dark:border-white/20 bg-background/95 backdrop-blur shadow-xl">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-black/10 dark:border-white/10">
          <button onClick={() => setOpen((o) => !o)} className="text-sm font-semibold">
            {open ? "▾" : "▸"} Лог API ({entries.length})
          </button>
          <button onClick={clear} className="ml-auto text-xs opacity-60 hover:opacity-100">
            очистить
          </button>
        </div>
        {open && (
          <div className="max-h-[38vh] overflow-y-auto p-2 flex flex-col gap-1.5">
            {entries.length === 0 && <div className="text-xs opacity-50 p-2">пусто — сделай любое действие</div>}
            {entries.map((e) => (
              <details key={e.id} className={"rounded-lg border text-xs " + (e.ok ? "border-green-500/40" : "border-red-500/50")}>
                <summary className="cursor-pointer px-2 py-1 flex gap-2">
                  <span>{e.ok ? "✅" : "❌"}</span>
                  <span className="font-medium">{e.label}</span>
                  <span className="ml-auto opacity-40">{e.time}</span>
                </summary>
                <pre className="px-2 pb-2 whitespace-pre-wrap break-all opacity-80 max-h-52 overflow-y-auto">{e.detail}</pre>
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
  const base = "rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ";
  const styles =
    variant === "ghost"
      ? "border border-black/15 dark:border-white/25 hover:bg-black/5 dark:hover:bg-white/10"
      : variant === "danger"
        ? "bg-red-600 text-white hover:opacity-90"
        : "bg-foreground text-background hover:opacity-90";
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
      className={"rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:focus:border-white/50 " + (p.className ?? "")}
    />
  );
}

export function TextArea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={"rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 " + (p.className ?? "")}
    />
  );
}

export function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      {(title || right) && (
        <div className="flex items-center">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">{title}</h2>}
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Avatar({ src, size = 40, name }: { src?: string | null; size?: number; name?: string }) {
  const s = { width: size, height: size };
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name ?? ""} style={s} className="rounded-full object-cover shrink-0" />;
  return (
    <div style={s} className="rounded-full shrink-0 grid place-items-center bg-gradient-to-tr from-pink-500 to-orange-400 text-white text-xs font-bold">
      {(name ?? "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div
        className={"bg-background rounded-2xl overflow-hidden max-h-[90vh] w-full " + (wide ? "max-w-4xl" : "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : "");
