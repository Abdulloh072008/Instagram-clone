"use client";

import { useEffect, useRef, useState } from "react";
import { gifs } from "@/lib/services";
import { SearchIcon } from "./Icons";
import type { GifItem } from "@/lib/types";

/** Giphy-backed GIF search; trending until you type. Click a GIF to send it. */
export default function GifPicker({ onPick }: { onPick: (gif: GifItem) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GifItem[]>([]);
  const [busy, setBusy] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setBusy(true);
    const run = query.trim() ? () => gifs.search(query.trim(), 24) : () => gifs.trending(24);
    debounce.current = setTimeout(() => {
      run()
        .then((r) => setItems(r.data ?? []))
        .catch(() => setItems([]))
        .finally(() => setBusy(false));
    }, query.trim() ? 350 : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <div className="flex h-80 flex-col">
      <div className="border-b border-line p-2">
        <div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2">
          <SearchIcon size={15} className="text-neutral-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIPHY"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {busy && <p className="p-4 text-center text-sm text-neutral-500">Loading…</p>}
        {!busy && items.length === 0 && (
          <p className="p-4 text-center text-sm text-neutral-500">No GIFs found.</p>
        )}
        <div className="columns-2 gap-2 [&>*]:mb-2">
          {items.map((g) => (
            <button
              key={g.id}
              onClick={() => onPick(g)}
              className="block w-full overflow-hidden rounded-lg"
            >
              {/* Giphy preview; plain img since it's an external animated GIF. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.preview} alt={g.title} loading="lazy" className="w-full" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
