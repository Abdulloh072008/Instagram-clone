"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";
import { stories as storiesApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { loadSeen, saveSeen, storyKey } from "@/lib/seenStories";
import type { UserStories } from "@/lib/types";
import { PlusIcon } from "./Icons";

export default function StoriesBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserStories[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setSeen(loadSeen()), []);

  const load = () =>
    storiesApi
      .all()
      .then((res) => setGroups(Array.isArray(res) ? res : []))
      .catch(() => setGroups([]));

  useEffect(() => {
    load();
  }, []);

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

  // Only users with stories are openable; unwatched ones bubble to the front.
  const withStories = groups
    .filter((g) => g.stories && g.stories.length > 0)
    .sort((a, b) => Number(allSeen(a)) - Number(allSeen(b)));

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await storiesApi.add(file);
      await load();
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-line px-3 py-4 md:rounded-lg md:border">
        {/* Your story — add from here */}
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="relative">
            <Avatar src={user?.image} name={user?.userName} size={58} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-ig-blue">
              <PlusIcon size={12} />
            </span>
          </div>
          <span className="w-full truncate text-center text-xs text-neutral-400">
            {uploading ? "Adding…" : "Your story"}
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={onPickFile}
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
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
