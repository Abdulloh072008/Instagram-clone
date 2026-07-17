"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Img from "./Img";
import { timeAgo, isVideo, cn } from "@/lib/utils";
import { imageUrl } from "@/lib/config";
import { stories as storiesApi } from "@/lib/services";
import { storyKey } from "@/lib/seenStories";
import { applyReaction, EMPTY_REACTIONS } from "@/lib/storyReactions";
import { toast } from "@/lib/toast";
import type { UserStories, StoryItem, AuthUser, StoryReactions } from "@/lib/types";
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

/** One flying emoji from a reaction burst. */
type Burst = { key: number; emoji: string; dx: string; spin: string; delay: string };

function storyMedia(s: StoryItem): string | undefined {
  return s.mediaUrl ?? s.fileName ?? s.image ?? (s.images as string[] | undefined)?.[0];
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
  // Tagged with the story it belongs to, so stepping to the next story can't
  // flash the previous one's tallies while the new ones load.
  const [reactionState, setReactionState] = useState<{ id: number; data: StoryReactions } | null>(
    null,
  );
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [popped, setPopped] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reply, setReply] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const burstId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const group = groups[gi];
  const story = group?.stories[si];
  const media = story && storyMedia(story);
  const url = imageUrl(media);
  // The backend labels the media now; fall back to sniffing the extension.
  const video = story?.type === "video" || (story?.type !== "image" && isVideo(media));
  const id = story ? storyKey(story) : undefined;
  const mine = !!me?.id && group?.userId === me.id;
  const reactions = reactionState && reactionState.id === id ? reactionState.data : null;

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
    if (id == null) return;
    onSeen(id);
    if (me) storiesApi.view(id, me).catch(() => {});
  }, [id, onSeen, me]);

  // Pull the reaction tallies for whichever story is on screen.
  useEffect(() => {
    if (id == null) return;
    let alive = true;
    storiesApi
      .reactions(id, me?.id)
      .then((r) => alive && setReactionState({ id, data: r.data ?? EMPTY_REACTIONS }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, me?.id]);

  // Drop any in-flight burst/pop timers if the viewer closes mid-animation.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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
      // Don't steal space/arrows from someone typing a reply.
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!group || !story) return null;

  const like = () => {
    if (id == null || !me) return;
    setLiked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    storiesApi.like(id, me).catch(() => {});
  };

  // Throw a handful of the emoji up the screen, each on its own path.
  const fly = (emoji: string) => {
    const particles: Burst[] = Array.from({ length: 6 }, (_, i) => ({
      key: burstId.current++,
      emoji,
      dx: `${Math.round((Math.random() * 2 - 1) * 90)}px`,
      spin: `${Math.round((Math.random() * 2 - 1) * 60)}deg`,
      delay: `${i * 70}ms`,
    }));
    setBursts((b) => [...b, ...particles]);
    const keys = new Set(particles.map((p) => p.key));
    timers.current.push(
      setTimeout(() => setBursts((b) => b.filter((p) => !keys.has(p.key))), 1600),
    );
  };

  const react = (emoji: string) => {
    if (id == null || !me) return;
    const rollback = reactionState;
    const next = applyReaction(reactions, emoji);

    // Animate off the tap, not the response — the round trip is too slow to feel like a reaction.
    setReactionState({ id, data: next });
    setPopped(emoji);
    timers.current.push(setTimeout(() => setPopped(null), 450));
    if (next.mine) fly(emoji);

    const sent = next.mine ? storiesApi.react(id, me, emoji) : storiesApi.unreact(id, me.id);
    sent
      // Re-read so other people's counts land, not just my own guess.
      .then(() => storiesApi.reactions(id, me.id))
      .then((r) => setReactionState({ id, data: r.data ?? next }))
      .catch(() => {
        setReactionState(rollback);
        toast("Couldn't save your reaction");
      });
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!text || id == null || !me) return;
    setReply("");
    storiesApi
      .reply(id, group.userId, me, text)
      .then(() => toast("Reply sent", "ok"))
      .catch(() => toast("Couldn't send your reply"));
  };

  const remove = () => {
    if (id == null) return;
    setMenuOpen(false);
    // Close only once the delete has landed — closing first refetches the feed,
    // which used to race the request and bring the story straight back.
    storiesApi
      .remove(id)
      .then(() => toast("Story deleted", "danger"))
      .catch(() => toast("Couldn't delete your story"))
      .finally(onClose);
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
          <span className="text-xs text-white/70">
            {timeAgo(story.createdAt ?? story.createAt ?? story.dateCreated)}
          </span>

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

        {/* reactions flying up from the bar */}
        {bursts.map((b) => (
          <span
            key={b.key}
            className="animate-react-fly pointer-events-none absolute bottom-28 left-1/2 z-20 text-5xl"
            style={
              { "--dx": b.dx, "--spin": b.spin, animationDelay: b.delay } as React.CSSProperties
            }
          >
            {b.emoji}
          </span>
        ))}

        {/* footer: caption + reactions + reply + like */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex flex-col gap-3 px-3">
          {story.caption && (
            <p className="text-center text-sm text-white drop-shadow">{story.caption}</p>
          )}

          <div className="flex justify-center gap-1.5">
            {REACTIONS.map((e) => {
              const count = reactions?.summary.find((s) => s.emoji === e)?.count ?? 0;
              const isMine = reactions?.mine === e;
              return (
                <button
                  key={e}
                  onClick={() => react(e)}
                  disabled={!me}
                  aria-pressed={isMine}
                  aria-label={`react ${e}`}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 transition hover:scale-110 disabled:opacity-40",
                    isMine ? "bg-white/25 ring-1 ring-white/70" : "hover:bg-white/10",
                  )}
                >
                  <span className={cn("inline-block text-2xl", popped === e && "animate-react-pop")}>
                    {e}
                  </span>
                  {count > 0 && (
                    <span className="text-xs tabular-nums text-white/80">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              disabled={!me}
              placeholder={`Reply to ${group.userName}…`}
              className="flex-1 rounded-full border border-white/30 bg-transparent px-4 py-2 text-sm outline-none disabled:opacity-40"
            />
            <button onClick={like} disabled={!me} aria-label="like">
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
