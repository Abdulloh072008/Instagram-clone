"use client";

import { useEffect, useState } from "react";
import PostGrid from "@/components/PostGrid";
import Img from "@/components/Img";
import { profiles, collections, type CollectionDto } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { Post } from "@/lib/types";

export default function SavedPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [cols, setCols] = useState<CollectionDto[]>([]);
  const [tab, setTab] = useState<"all" | number>("all");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCols = () => { if (user?.id) collections.byUser(user.id).then((r) => setCols(r.data ?? [])).catch(() => {}); };

  useEffect(() => {
    profiles.favorites().then((r) => setFavorites(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    loadCols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const activeCol = typeof tab === "number" ? cols.find((c) => c.id === tab) : null;
  const shown = tab === "all" ? favorites : favorites.filter((p) => activeCol?.postIds.includes(p.postId));

  return (
    <div className="mx-auto max-w-[935px] px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Saved</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-700"
        >
          + New collection
        </button>
      </div>

      {/* tabs */}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <TabChip active={tab === "all"} onClick={() => setTab("all")}>All ({favorites.length})</TabChip>
        {cols.map((c) => (
          <TabChip key={c.id} active={tab === c.id} onClick={() => setTab(c.id)}>
            {c.name} ({c.postIds.length})
          </TabChip>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : shown.length > 0 ? (
        <PostGrid posts={shown} />
      ) : (
        <p className="py-16 text-center text-neutral-500">
          {tab === "all" ? "No saved posts yet." : "This collection is empty."}
        </p>
      )}

      {creating && user && (
        <CreateCollection
          userId={user.id}
          favorites={favorites}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); loadCols(); }}
        />
      )}
    </div>
  );
}

function TabChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
        active ? "border-white bg-white text-black" : "border-line text-neutral-300 hover:bg-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function CreateCollection({
  userId, favorites, onClose, onCreated,
}: {
  userId: string; favorites: Post[]; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const ids = [...selected];
    const cover = favorites.find((p) => p.postId === ids[0])?.images?.[0];
    await collections.create(userId, name.trim(), ids, cover).catch(() => {});
    setBusy(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-neutral-950 p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 font-semibold">New collection</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="mb-3 w-full rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <p className="mb-2 text-xs text-neutral-500">Pick saved posts to add:</p>
        {favorites.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">No saved posts yet.</p>
        ) : (
          <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
            {favorites.map((p) => (
              <button
                key={p.postId}
                onClick={() => toggle(p.postId)}
                className={`relative aspect-square overflow-hidden rounded-md ${selected.has(p.postId) ? "ring-2 ring-ig-blue" : ""}`}
              >
                <Img src={p.images?.[0]} alt="" className="h-full w-full object-cover" />
                {selected.has(p.postId) && (
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
            disabled={busy || !name.trim()}
            className="rounded-lg bg-ig-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
