"use client";

import { useEffect, useState } from "react";
import Img from "./Img";
import HighlightViewer from "./HighlightViewer";
import { highlights, stories as storiesApi, type HighlightDto } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { isVideo } from "@/lib/utils";
import { PlusIcon } from "./Icons";
import type { UserStories, StoryItem } from "@/lib/types";

function storyMedia(s: StoryItem): string {
  return s.fileName ?? s.image ?? (s.images as string[] | undefined)?.[0] ?? "";
}

/** Ряд Highlights на профиле (+ создание, для своего профиля). */
export default function Highlights({ userId, isMe }: { userId: string; isMe: boolean }) {
  const { user } = useAuth();
  const [list, setList] = useState<HighlightDto[]>([]);
  const [viewing, setViewing] = useState<HighlightDto | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => highlights.byUser(userId).then((r) => setList(r.data ?? [])).catch(() => {});
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (list.length === 0 && !isMe) return null;

  return (
    <div className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line px-4 py-4">
      {isMe && (
        <button onClick={() => setCreating(true)} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-line text-neutral-400">
            <PlusIcon size={22} />
          </span>
          <span className="text-xs text-neutral-400">New</span>
        </button>
      )}
      {list.map((h) => (
        <button key={h.id} onClick={() => setViewing(h)} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-line bg-neutral-900">
            <Img src={h.coverUrl ?? undefined} alt={h.title} className="h-full w-full object-cover" />
          </span>
          <span className="w-full truncate text-center text-xs">{h.title}</span>
        </button>
      ))}

      {viewing && <HighlightViewer title={viewing.title} items={viewing.items} onClose={() => setViewing(null)} />}
      {creating && user && (
        <CreateHighlight userId={user.id} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />
      )}
    </div>
  );
}

function CreateHighlight({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [mediaList, setMediaList] = useState<{ mediaUrl: string; type: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storiesApi.mine().then((res) => {
      const groups = (Array.isArray(res) ? res : []) as UserStories[];
      const items = groups
        .flatMap((g) => g.stories)
        .map((s) => { const m = storyMedia(s); return { mediaUrl: m, type: isVideo(m) ? "video" : "image" }; })
        .filter((x) => x.mediaUrl);
      setMediaList(items);
    }).catch(() => {});
  }, []);

  const toggle = (m: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(m)) n.delete(m); else n.add(m); return n; });

  const create = async () => {
    const items = mediaList.filter((x) => selected.has(x.mediaUrl));
    if (!items.length) return;
    setBusy(true);
    await highlights.create(userId, title.trim() || "Highlights", items).catch(() => {});
    setBusy(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-neutral-950 p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-semibold">New highlight</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mb-3 w-full rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        {mediaList.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">No stories to add. Post a story first.</p>
        ) : (
          <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
            {mediaList.map((m, idx) => (
              <button
                key={idx}
                onClick={() => toggle(m.mediaUrl)}
                className={`relative aspect-[9/16] overflow-hidden rounded-md ${selected.has(m.mediaUrl) ? "ring-2 ring-ig-blue" : ""}`}
              >
                <Img src={m.mediaUrl} alt="" className="h-full w-full object-cover" />
                {selected.has(m.mediaUrl) && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ig-blue text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={create}
            disabled={busy || selected.size === 0}
            className="rounded-lg bg-ig-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
