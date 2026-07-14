"use client";

import { useRef, useState } from "react";
import { imageUrl } from "@/lib/config";
import { PlayIcon, PauseIcon, SoundOn, SoundOff } from "./Icons";

/** Feed/modal video: autoplays muted; centered play/pause + hover mute button, all ref-driven. */
export default function FeedVideo({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className="group relative h-full w-full">
      <video
        ref={ref}
        src={imageUrl(src)}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className={`rounded-full bg-black/50 p-4 transition ${
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </span>
      </button>
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-3 right-3 z-10 rounded-full bg-black/50 p-2 opacity-0 transition group-hover:opacity-100"
      >
        {muted ? <SoundOff size={20} /> : <SoundOn size={20} />}
      </button>
    </div>
  );
}
