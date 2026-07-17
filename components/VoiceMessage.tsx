"use client";

import { useEffect, useRef, useState } from "react";
import { imageUrl } from "@/lib/config";
import { PlayIcon, PauseIcon } from "./Icons";

// A fixed set of bar heights, picked per message id so each voice note looks
// distinct but stable across renders. Decorative on purpose: decoding the real
// amplitude fails on webm/opus in Safari, and Instagram's waveform is barely
// legible at this size anyway — see the grilling notes.
const BAR_COUNT = 32;
function bars(seed: number): number[] {
  const out: number[] = [];
  let x = Math.abs(seed) || 1;
  for (let i = 0; i < BAR_COUNT; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff; // cheap LCG, deterministic per seed
    out.push(0.25 + (x % 1000) / 1000 * 0.75); // 0.25..1.0
  }
  return out;
}

function clock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VoiceMessage({
  src,
  durationSec,
  seed,
  mine,
}: {
  src: string;
  durationSec?: number | null;
  seed: number;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [elapsed, setElapsed] = useState(0);
  const shape = bars(seed);

  // Sync play/pause state from the element itself, so it stays correct however
  // playback starts or stops.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  // Drive the progress fill from requestAnimationFrame while playing, not from
  // the `timeupdate` event (which fires ~4x/sec and makes the fill step). This
  // is what keeps the waveform gliding instead of skipping.
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const loop = () => {
      const a = audioRef.current;
      if (a) {
        const total = a.duration || durationSec || 0;
        setElapsed(a.currentTime);
        setProgress(total ? Math.min(1, a.currentTime / total) : 0);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing, durationSec]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  }

  const filled = mine ? "bg-white" : "bg-ig-blue";
  const empty = mine ? "bg-white/40" : "bg-neutral-500";

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="shrink-0">
        {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
      </button>
      <div className="flex h-7 items-center gap-[2px]">
        {shape.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] origin-center rounded-full ${
              i / BAR_COUNT <= progress ? filled : empty
            } ${playing ? "animate-voice-bar" : ""}`}
            style={{
              height: `${Math.round(h * 100)}%`,
              // Stagger the ripple across the bars while playing.
              animationDelay: playing ? `${(i % 8) * 0.08}s` : undefined,
            }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[11px] tabular-nums opacity-80">
        {clock(playing || progress > 0 ? elapsed : (durationSec ?? 0))}
      </span>
      <audio ref={audioRef} src={imageUrl(src)} preload="metadata" />
    </div>
  );
}
