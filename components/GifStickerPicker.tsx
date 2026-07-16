"use client";

import { useEffect, useState } from "react";
import { gifs, stickerCatalog, type GifDto, type StickerDto } from "@/lib/services";

/** Пикер GIF (Giphy) и стикеров. onPick отдаёт текст сообщения (URL гифки или эмодзи). */
export default function GifStickerPicker({ onPick, onClose }: { onPick: (text: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"gif" | "sticker">("gif");
  const [q, setQ] = useState("");
  const [gifList, setGifList] = useState<GifDto[]>([]);
  const [stickers, setStickers] = useState<StickerDto[]>([]);

  useEffect(() => {
    stickerCatalog.get().then((r) => setStickers(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== "gif") return;
    const t = setTimeout(() => {
      (q.trim() ? gifs.search(q, 24) : gifs.trending(24))
        .then((r) => setGifList(r.data ?? []))
        .catch(() => setGifList([]));
    }, 350);
    return () => clearTimeout(t);
  }, [q, tab]);

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute bottom-14 left-2 right-2 z-30 mx-auto max-w-[420px] rounded-2xl border border-line bg-neutral-950 p-3 shadow-2xl">
        <div className="mb-2 flex items-center gap-4 text-sm font-semibold">
          <button onClick={() => setTab("gif")} className={tab === "gif" ? "text-white" : "text-neutral-500"}>GIF</button>
          <button onClick={() => setTab("sticker")} className={tab === "sticker" ? "text-white" : "text-neutral-500"}>Stickers</button>
          <button onClick={onClose} className="ml-auto text-neutral-500 hover:text-white">✕</button>
        </div>

        {tab === "gif" ? (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search GIPHY…"
              autoFocus
              className="mb-2 w-full rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
              {gifList.map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <button key={g.id} onClick={() => { onPick(g.url); onClose(); }} className="aspect-square overflow-hidden rounded-md bg-neutral-800">
                  <img src={g.preview || g.url} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
              {gifList.length === 0 && <p className="col-span-3 py-6 text-center text-sm text-neutral-600">No GIFs</p>}
            </div>
          </>
        ) : (
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
            {stickers.map((s) => (
              <button key={s.id} onClick={() => { onPick(s.url); onClose(); }} className="grid aspect-square place-items-center rounded-md text-2xl hover:bg-neutral-800">
                {s.url}
              </button>
            ))}
            {stickers.length === 0 && <p className="col-span-6 py-6 text-center text-sm text-neutral-600">No stickers</p>}
          </div>
        )}
      </div>
    </>
  );
}
