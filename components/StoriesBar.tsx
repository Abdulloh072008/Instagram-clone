"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";
import { stories as storiesApi, follows } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import {
  loadSeen,
  saveSeen,
  storyKey,
  freshStories,
  followedStories,
  nextExpiry,
} from "@/lib/seenStories";
import { StoriesBarSkeleton } from "./Skeleton";
import { toast } from "@/lib/toast";
import type { UserStories } from "@/lib/types";
import { PlusIcon } from "./Icons";

export default function StoriesBar() {
  const { user } = useAuth();
  // The feed exactly as fetched; what's still live is derived from it against
  // `now`, so a story can lapse while the tab sits open without a refetch.
  const [fetched, setFetched] = useState<UserStories[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const groups = useMemo(() => freshStories(fetched, now), [fetched, now]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setSeen(loadSeen()), []);

  // Re-run after an upload too; loading is already false by then, so no reflash.
  // The feed isn't filtered server-side, so it's paired with the follow list and
  // narrowed here. If the follow list can't be fetched we fall back to your own
  // stories only — showing strangers' would be the worse way to be wrong.
  const load = useCallback(() => {
    if (!user) return;
    return Promise.all([
      storiesApi.all(),
      follows
        .subscriptions(user.id)
        .then((r) => r.data ?? [])
        .catch(() => []),
    ])
      .then(([feed, following]) =>
        setFetched(
          followedStories(
            feed,
            following.map((u) => u.userShortInfo.userId),
            user.id,
          ),
        ),
      )
      .catch(() => setFetched([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Expire on the server's clock while the tab stays open: wake exactly when the
  // soonest story lapses instead of polling. Re-arms itself as each one goes.
  useEffect(() => {
    const at = nextExpiry(groups);
    if (at === Infinity) return;
    const t = setTimeout(() => setNow(Date.now()), Math.max(0, at - Date.now()) + 500);
    return () => clearTimeout(t);
  }, [groups]);

  // Stable identity so StoryViewer's mark-seen effect only fires on story change.
  const markSeen = useCallback((id: number) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev; // no-op keeps the same Set → no extra render
      const next = new Set(prev).add(id);
      saveSeen(next);
      return next;
    });
  }, []);

  const allSeen = (g: UserStories) =>
    g.stories.every((s) => {
      const id = storyKey(s);
      return id != null && seen.has(id);
    });

  // Already 24h-filtered at fetch; here just float unwatched users to the front.
  const withStories = [...groups].sort((a, b) => Number(allSeen(a)) - Number(allSeen(b)));

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !user) return;
    setUploading(true);
    try {
      for (const file of files) await storiesApi.add(user, file); // one call per file — API takes a single file
      await load();
      toast(files.length > 1 ? "Stories added" : "Story added", "ok");
    } catch {
      toast("Couldn't upload your story");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <StoriesBarSkeleton />;

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-line px-3 py-4 md:rounded-lg md:border">
        {/* Your story — add from here */}
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-neutral-800 text-neutral-200 transition hover:bg-neutral-700">
            <PlusIcon size={26} />
          </div>
          <span className="w-full truncate text-center text-xs text-neutral-400">
            {uploading ? "Adding…" : "Your story"}
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />

        {withStories.map((g, idx) => (
          <button
            key={g.userId}
            onClick={() => setViewerIndex(idx)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <Avatar src={g.userImage} name={g.userName} size={58} ring={allSeen(g) ? "seen" : true} />
            <span className="w-full truncate text-center text-xs text-neutral-300">{g.userName}</span>
          </button>
        ))}

        {withStories.length === 0 && (
          <div className="flex items-center text-sm text-neutral-600">No stories yet</div>
        )}
      </div>

      {viewerIndex !== null && withStories.length > 0 && (
        <StoryViewer
          groups={withStories}
          startIndex={viewerIndex}
          seen={seen}
          onSeen={markSeen}
          me={user}
          onClose={() => {
            setViewerIndex(null);
            load(); // pick up any story the user just deleted
          }}
        />
      )}
    </>
  );
}
