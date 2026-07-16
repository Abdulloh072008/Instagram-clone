"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "./Avatar";
import Img from "./Img";
import { timeAgo } from "@/lib/utils";
import { stories as storiesApi } from "@/lib/services";
import { storyKey } from "@/lib/seenStories";
import type { UserStories, StoryItem } from "@/lib/types";
import { CloseIcon, HeartIcon, ShareIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const DURATION = 5000;

function storyImage(s: StoryItem): string | undefined {
  return s.fileName ?? s.image ?? (s.images as string[] | undefined)?.[0];
}

/** First story the viewer hasn't watched yet — where playback should begin. */
function firstUnseen(group: UserStories, seen: Set<number>): number {
  const i = group.stories.findIndex((s) => {
    const id = storyKey(s);
    return id == null || !seen.has(id);
  });
  return i === -1 ? 0 : i;
}

export default function StoryViewer({
  groups,
  startIndex,
  seen,
  onSeen,
  onClose,
}: {
  groups: UserStories[];
  startIndex: number;
  seen: Set<number>;
  onSeen: (storyId: number) => void;
  onClose: () => void;
}) {
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(() => firstUnseen(groups[startIndex], seen));
  const [progress, setProgress] = useState(0);

  const group = groups[gi];
  const story = group?.stories[si];

  // Jump straight to another user's stories (side previews / arrows), starting
  // at their first unwatched story.
  const goToGroup = useCallback(
    (g: number) => {
      setProgress(0);
      setGi(g);
      setSi(firstUnseen(groups[g], seen));
    },
    [groups, seen],
  );

  const next = useCallback(() => {
    setProgress(0);
    if (si < group.stories.length - 1) setSi((s) => s + 1);
    else if (gi < groups.length - 1) goToGroup(gi + 1);
    else onClose();
  }, [si, gi, group, groups.length, goToGroup, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (si > 0) setSi((s) => s - 1);
    else if (gi > 0) {
      const pg = gi - 1;
      setGi(pg);
      setSi(groups[pg].stories.length - 1);
    }
  }, [si, gi, groups]);

  // Mark each shown story as seen (locally + on the backend).
  useEffect(() => {
    const id = story && storyKey(story);
    if (id != null) {
      onSeen(id);
      storiesApi.view(id).catch(() => {});
    }
  }, [story, onSeen]);

  // Auto-advance timer.
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setProgress(p);
      if (p >= 1) {
        clearInterval(t);
        next();
      }
    }, 50);
    return () => clearInterval(t);
  }, [gi, si, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!group || !story) return null;

  const sideGroup = groups[gi - 1];
  const sideGroupNext = groups[gi + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center gap-3 bg-black/95 p-4">
      <button onClick={onClose} className="absolute right-5 top-5 text-white/80 hover:text-white">
        <CloseIcon size={28} />
      </button>

      {/* Previous user's story — faded preview (swiper look) */}
      <SidePreview group={sideGroup} onClick={() => goToGroup(gi - 1)} />

      <button
        onClick={prev}
        disabled={gi === 0 && si === 0}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-black disabled:opacity-0 md:flex"
        aria-label="previous"
      >
        <ChevronLeftIcon size={18} />
      </button>

      <div className="relative aspect-[9/16] h-[85vh] max-h-[720px] w-auto overflow-hidden rounded-xl bg-neutral-900">
        {/* progress bars */}
        <div className="absolute left-0 right-0 top-2 z-10 flex gap-1 px-3">
          {group.stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{ width: i < si ? "100%" : i === si ? `${progress * 100}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute left-0 right-0 top-5 z-10 flex items-center gap-2 px-3">
          <Avatar src={group.userImage} name={group.userName} size={32} />
          <span className="text-sm font-semibold">{group.userName}</span>
          <span className="text-xs text-white/70">
            {timeAgo(story.createAt ?? story.dateCreated)}
          </span>
        </div>

        <Img src={storyImage(story)} alt="story" className="h-full w-full object-cover" />

        {/* nav zones */}
        <button className="absolute left-0 top-0 h-full w-1/3" onClick={prev} aria-label="prev" />
        <button className="absolute right-0 top-0 h-full w-1/3" onClick={next} aria-label="next" />

        {/* footer */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center gap-2 px-3">
          <input
            placeholder={`Reply to ${group.userName}…`}
            className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-sm outline-none"
          />
          <button
            onClick={() => {
              const id = storyKey(story);
              if (id != null) storiesApi.like(id).catch(() => {});
            }}
          >
            <HeartIcon size={24} />
          </button>
          <button>
            <ShareIcon size={22} />
          </button>
        </div>
      </div>

      <button
        onClick={next}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-black md:flex"
        aria-label="next"
      >
        <ChevronRightIcon size={18} />
      </button>

      {/* Next user's story — faded preview */}
      <SidePreview group={sideGroupNext} onClick={() => goToGroup(gi + 1)} />
    </div>
  );
}

function SidePreview({ group, onClick }: { group?: UserStories; onClick: () => void }) {
  if (!group) return <div className="hidden w-[110px] shrink-0 lg:block" />;
  return (
    <button
      onClick={onClick}
      className="relative hidden aspect-[9/16] w-[110px] shrink-0 overflow-hidden rounded-lg opacity-60 transition hover:opacity-90 lg:block"
    >
      <Img src={storyImage(group.stories[0])} alt={group.userName} className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-0 right-0 truncate px-2 text-center text-xs text-white/90">
        {group.userName}
      </span>
    </button>
  );
}
