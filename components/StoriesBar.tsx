"use client";

import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";
import { stories as storiesApi } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { UserStories } from "@/lib/types";
import { PlusIcon } from "./Icons";

export default function StoriesBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserStories[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    storiesApi
      .all()
      .then((res) => setGroups(Array.isArray(res) ? res : []))
      .catch(() => setGroups([]));
  }, []);

  // Only users that actually have stories are openable.
  const withStories = groups.filter((g) => g.stories && g.stories.length > 0);

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-line px-3 py-4 md:rounded-lg md:border">
        {/* Your story */}
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <Avatar name={user?.userName} size={58} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-ig-blue">
              <PlusIcon size={12} />
            </span>
          </div>
          <span className="w-full truncate text-center text-xs text-neutral-400">Your story</span>
        </div>

        {groups.map((g) => {
          const openable = g.stories && g.stories.length > 0;
          const idx = withStories.findIndex((x) => x.userId === g.userId);
          return (
            <button
              key={g.userId}
              onClick={() => openable && setViewerIndex(idx)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <Avatar src={g.userImage} name={g.userName} size={58} ring={openable} />
              <span className="w-full truncate text-center text-xs text-neutral-300">
                {g.userName}
              </span>
            </button>
          );
        })}

        {groups.length === 0 && (
          <div className="flex items-center text-sm text-neutral-600">No stories yet</div>
        )}
      </div>

      {viewerIndex !== null && withStories.length > 0 && (
        <StoryViewer
          groups={withStories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
