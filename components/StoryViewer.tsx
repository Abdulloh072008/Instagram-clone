"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Img from "./Img";
import { timeAgo, isVideo } from "@/lib/utils";
import { imageUrl } from "@/lib/config";
import { stories as storiesApi, posts as postsApi } from "@/lib/services";
import { storyKey } from "@/lib/seenStories";
import type { UserStories, StoryItem, AuthUser } from "@/lib/types";
import {
  CloseIcon,
  HeartIcon,
  HeartFilled,
  ChevronLeftIcon,
  ChevronRightIcon,
  SoundOn,
  SoundOff,
  PlayIcon,
  PauseIcon,
  MoreIcon,
  TrashIcon,
} from "./Icons";

const IMG_DURATION = 5000; // ponytail: images have no intrinsic length; videos use their own
const REACTIONS = ["😂", "😮", "😍", "😢", "👏", "🔥"];

function storyMedia(s: StoryItem): string | undefined {
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
  me,
  onClose,
}: {
  groups: UserStories[];
  startIndex: number;
  seen: Set<number>;
  onSeen: (storyId: number) => void;
  me?: AuthUser | null;
  onClose: () => void;
}) {
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(() => firstUnseen(groups[startIndex], seen));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [reacted, setReacted] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reply, setReply] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const group = groups[gi];
  const story = group?.stories[si];
  const media = story && storyMedia(story);
  const url = imageUrl(media);
  const video = isVideo(media);
  const id = story ? storyKey(story) : undefined;
  const mine = !!me?.id && group?.userId === me.id;

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
    if (id != null) {
      onSeen(id);
      storiesApi.view(id).catch(() => {});
    }
  }, [id, onSeen]);

  // Image timer — resumes from where it paused; videos drive their own progress.
  useEffect(() => {
    if (video || paused) return;
    const start = Date.now() - progress * IMG_DURATION;
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / IMG_DURATION);
      setProgress(p);
      if (p >= 1) {
        clearInterval(t);
        next();
      }
    }, 50);
    return () => clearInterval(t);
    // progress intentionally omitted: it seeds `start`, re-adding it would restart every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si, video, paused, next]);

  // Keep the <video> element in sync with pause state.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause();
    else el.play().catch(() => {});
  }, [paused, gi, si]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!group || !story) return null;

  const like = () => {
    if (id == null) return;
    setLiked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    storiesApi.like(id).catch(() => {});
  };

  const react = (emoji: string) => {
    if (id == null || !me) return;
    setReacted(emoji);
    setTimeout(() => setReacted(null), 900);
    storiesApi.react(me.id, me.userName, id, emoji).catch(() => {});
  };

  // "Comment" = reply, routed to a comment on the story's underlying post.
  const sendReply = () => {
    const text = reply.trim();
    const postId = story.postId;
    if (!text || !postId) return;
    setReply("");
    postsApi.addComment(postId, text).catch(() => {});
  };

  const remove = () => {
    if (id == null) return;
    storiesApi.remove(id).catch(() => {});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center gap-3 bg-black/95 p-4">
      <button onClick={onClose} className="absolute right-5 top-5 z-20 text-white/80 hover:text-white">
        <CloseIcon size={28} />
      </button>

      <SidePreview group={groups[gi - 1]} onClick={() => goToGroup(gi - 1)} />

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

        {/* header: author + name + time-ago (left) — controls (right) */}
        <div className="absolute left-0 right-0 top-4 z-10 flex items-center gap-2 px-3">
          <Avatar src={group.userImage} name={group.userName} size={32} />
          <span className="text-sm font-semibold">{group.userName}</span>
          <span className="text-xs text-white/70">{timeAgo(story.createAt ?? story.dateCreated)}</span>

          <div className="ml-auto flex items-center gap-3">
            {video && (
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "unmute" : "mute"}>
                {muted ? <SoundOff size={22} /> : <SoundOn size={22} />}
              </button>
            )}
            <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "play" : "pause"}>
              {paused ? <PlayIcon size={22} /> : <PauseIcon size={22} />}
            </button>
            {mine && (
              <div className="relative">
                <button onClick={() => setMenuOpen((o) => !o)} aria-label="more">
                  <MoreIcon size={22} />
                </button>
                {menuOpen && (
                  <button
                    onClick={remove}
                    className="absolute right-0 top-7 flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-red-400"
                  >
                    <TrashIcon size={16} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* media */}
        {video ? (
          <video
            ref={videoRef}
            src={url}
            className="h-full w-full object-cover"
            autoPlay
            muted={muted}
            playsInline
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration) setProgress(el.currentTime / el.duration);
            }}
            onEnded={next}
          />
        ) : (
          <Img src={media} alt="story" className="h-full w-full object-cover" />
        )}

        {/* tap zones (below controls so buttons stay clickable) */}
        <button className="absolute left-0 top-16 h-[calc(100%-9rem)] w-1/3" onClick={prev} aria-label="prev" />
        <button className="absolute right-0 top-16 h-[calc(100%-9rem)] w-1/3" onClick={next} aria-label="next" />

        {/* flying reaction feedback */}
        {reacted && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-7xl">
            {reacted}
          </div>
        )}

        {/* footer: reactions + reply + like */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex flex-col gap-3 px-3">
          <div className="flex justify-center gap-3">
            {REACTIONS.map((e) => (
              <button key={e} onClick={() => react(e)} className="text-2xl transition hover:scale-125">
                {e}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder={`Reply to ${group.userName}…`}
              className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-sm outline-none"
            />
            <button onClick={like} aria-label="like">
              {id != null && liked.has(id) ? <HeartFilled size={24} className="text-red-500" /> : <HeartIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={next}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-black md:flex"
        aria-label="next"
      >
        <ChevronRightIcon size={18} />
      </button>

      <SidePreview group={groups[gi + 1]} onClick={() => goToGroup(gi + 1)} />
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
      <Img src={storyMedia(group.stories[0])} alt={group.userName} className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-0 right-0 truncate px-2 text-center text-xs text-white/90">
        {group.userName}
      </span>
    </button>
  );
}
