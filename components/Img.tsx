"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/config";
import { isVideo } from "@/lib/utils";

interface ImgProps {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Show native video controls (feed/modal). Off = muted poster frame (grid thumbnails). */
  controls?: boolean;
}

/** <img>/<video> with API base resolution and a graceful dark fallback. */
export default function Img({ src, alt = "", className = "", controls = false }: ImgProps) {
  const [broken, setBroken] = useState(false);
  const url = imageUrl(src);

  if (!url || broken) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-900 text-neutral-600 ${className}`}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  if (isVideo(src)) {
    return (
      <video
        src={url}
        className={className}
        controls={controls}
        muted={!controls}
        loop={!controls}
        playsInline
        preload="metadata"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} onError={() => setBroken(true)} loading="lazy" />
  );
}
