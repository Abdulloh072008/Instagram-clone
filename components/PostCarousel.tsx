"use client";

import { useRef, useState } from "react";
import Img from "./Img";
import FeedVideo from "./FeedVideo";
import { isVideo } from "@/lib/utils";

/** Media carousel: smooth translate-x slide + drag/swipe to the next slide; videos play via FeedVideo. */
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
  const [drag, setDrag] = useState(0); // px offset while dragging
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const width = useRef(0);
  const n = images.length;
  if (n === 0) return null;

  function go(to: number) {
    setSlide(Math.max(0, Math.min(n - 1, to)));
  }

  function onDown(e: React.PointerEvent) {
    if (n < 2) return;
    start.current = e.clientX;
    width.current = e.currentTarget.getBoundingClientRect().width;
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (start.current === null) return;
    let dx = e.clientX - start.current;
    // resist dragging past the first/last slide
    if ((slide === 0 && dx > 0) || (slide === n - 1 && dx < 0)) dx *= 0.3;
    setDrag(dx);
  }
  function onUp() {
    if (start.current === null) return;
    const threshold = width.current * 0.2 || 60;
    if (drag <= -threshold) go(slide + 1);
    else if (drag >= threshold) go(slide - 1);
    start.current = null;
    setDragging(false);
    setDrag(0);
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        className={`flex h-full w-full ${dragging ? "" : "transition-transform duration-300 ease-out"} ${n > 1 ? "touch-pan-y" : ""}`}
        style={{ transform: `translateX(calc(-${slide * 100}% + ${drag}px))` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
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
              onClick={() => go(slide - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm"
            >
              ‹
            </button>
          )}
          {slide < n - 1 && (
            <button
              onClick={() => go(slide + 1)}
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
