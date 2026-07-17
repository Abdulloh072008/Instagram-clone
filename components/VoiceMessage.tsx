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

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      const total = a.duration || durationSec || 0;
      setElapsed(a.currentTime);
      setProgress(total ? a.currentTime / total : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [durationSec]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
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
            className={`w-[3px] rounded-full ${i / BAR_COUNT <= progress ? filled : empty}`}
            style={{ height: `${Math.round(h * 100)}%` }}
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
