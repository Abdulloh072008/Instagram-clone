"use client";

import { useEffect, useState } from "react";
import { stickers } from "@/lib/services";

type Sticker = { id: number; pack: string; name: string; url: string };

/** Sticker packs (emoji glyphs in this backend). Click one to send it big. */
export default function StickerPicker({ onPick }: { onPick: (url: string) => void }) {
  const [items, setItems] = useState<Sticker[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const pack = (await stickers.packs()).data?.[0];
        if (pack) setItems((await stickers.get(pack)).data ?? []);
      } catch {
        setItems([]);
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  return (
    <div className="h-64 overflow-y-auto p-3">
      {busy && <p className="p-4 text-center text-sm text-neutral-500">Loading…</p>}
      {!busy && items.length === 0 && (
        <p className="p-4 text-center text-sm text-neutral-500">No stickers.</p>
      )}
      <div className="grid grid-cols-5 gap-1">
        {items.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.url)}
            className="rounded-lg p-1 text-3xl hover:bg-neutral-800"
            aria-label={s.name}
          >
            {s.url}
          </button>
        ))}
      </div>
    </div>
  );
}
