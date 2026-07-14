"use client";

import { useRef, useState } from "react";
import { imageUrl } from "@/lib/config";
import { PlayIcon, PauseIcon } from "./Icons";

/** Feed/modal video: no native controls, just a centered play/pause button driven by a ref. */
export default function FeedVideo({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  return (
    <div className="relative h-full w-full">
      <video
        ref={ref}
        src={imageUrl(src)}
        className={className}
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
        className="group absolute inset-0 flex items-center justify-center"
      >
        <span
          className={`rounded-full bg-black/50 p-4 transition ${
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </span>
      </button>
    </div>
  );
}
