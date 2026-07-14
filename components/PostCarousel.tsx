"use client";

import { useState } from "react";
import Img from "./Img";
import FeedVideo from "./FeedVideo";
import { isVideo } from "@/lib/utils";

/** Media carousel: smooth translate-x slide, video slides play via FeedVideo. */
export default function PostCarousel({
  images,
  alt = "",
  className = "",
}: {
  images: string[];
  alt?: string;
  className?: string;
}) {
  const [slide, setSlide] = useState(0);
  const n = images.length;
  if (n === 0) return null;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${slide * 100}%)` }}
      >
        {images.map((m, i) => (
          <div key={i} className="relative h-full w-full shrink-0 basis-full">
            {isVideo(m) ? (
              <FeedVideo src={m} className="h-full w-full object-cover" />
            ) : (
              <Img src={m} alt={alt} className="h-full w-full object-cover" />
            )}
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs">
            {slide + 1}/{n}
          </div>
          {slide > 0 && (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm"
            >
              ‹
            </button>
          )}
          {slide < n - 1 && (
            <button
              onClick={() => setSlide((s) => s + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm"
            >
              ›
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition ${i === slide ? "bg-ig-blue" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
