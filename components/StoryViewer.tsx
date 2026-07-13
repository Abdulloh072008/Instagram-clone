"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "./Avatar";
import Img from "./Img";
import { timeAgo } from "@/lib/utils";
import { stories as storiesApi } from "@/lib/services";
import type { UserStories, StoryItem } from "@/lib/types";
import { CloseIcon, HeartIcon, ShareIcon } from "./Icons";

const DURATION = 5000;

function storyImage(s: StoryItem): string | undefined {
  return s.fileName ?? s.image ?? (s.images as string[] | undefined)?.[0];
}
function storyId(s: StoryItem): number | undefined {
  return s.storyId ?? s.id;
}

export default function StoryViewer({
  groups,
  startIndex,
  onClose,
}: {
  groups: UserStories[];
  startIndex: number;
  onClose: () => void;
}) {
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);

  const group = groups[gi];
  const story = group?.stories[si];

  const next = useCallback(() => {
    setProgress(0);
    if (si < group.stories.length - 1) {
      setSi((s) => s + 1);
    } else if (gi < groups.length - 1) {
      setGi((g) => g + 1);
      setSi(0);
    } else {
      onClose();
    }
  }, [si, gi, group, groups.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (si > 0) setSi((s) => s - 1);
    else if (gi > 0) {
      const pg = gi - 1;
      setGi(pg);
      setSi(groups[pg].stories.length - 1);
    }
  }, [si, gi, groups]);

  // Record a view on each story shown.
  useEffect(() => {
    const id = story && storyId(story);
    if (id) storiesApi.view(id).catch(() => {});
  }, [story]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <button onClick={onClose} className="absolute right-5 top-5 text-white/80 hover:text-white">
        <CloseIcon size={28} />
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
              const id = storyId(story);
              if (id) storiesApi.like(id).catch(() => {});
            }}
          >
            <HeartIcon size={24} />
          </button>
          <button>
            <ShareIcon size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
