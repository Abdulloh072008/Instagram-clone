"use client";

import { useEffect, useState } from "react";
import Img from "./Img";
import { imageUrl } from "@/lib/config";
import { isVideo } from "@/lib/utils";
import { CloseIcon } from "./Icons";
import type { HighlightItemDto } from "@/lib/services";

/** Лёгкий просмотрщик подборки (Highlights): картинки автопереключаются, видео — по окончании. */
export default function HighlightViewer({ title, items, onClose }: { title: string; items: HighlightItemDto[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const item = items[i];
  const media = item?.mediaUrl;
  const video = item ? item.type === "video" || isVideo(media) : false;

  const next = () => { setProgress(0); if (i < items.length - 1) setI(i + 1); else onClose(); };
  const prev = () => { setProgress(0); setI((x) => Math.max(0, x - 1)); };

  useEffect(() => {
    if (video) return;
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 5000);
      setProgress(p);
      if (p >= 1) { clearInterval(t); next(); }
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, video]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4">
      <button onClick={onClose} className="absolute right-5 top-5 z-20 text-white/80 hover:text-white">
        <CloseIcon size={28} />
      </button>
      <div className="relative aspect-[9/16] h-[85vh] max-h-[720px] w-auto overflow-hidden rounded-xl bg-neutral-900">
        <div className="absolute left-0 right-0 top-2 z-10 flex gap-1 px-3">
          {items.map((_, idx) => (
            <div key={idx} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-white" style={{ width: idx < i ? "100%" : idx === i ? `${progress * 100}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="absolute left-0 right-0 top-4 z-10 px-3 text-sm font-semibold text-white">{title}</div>
        {video ? (
          <video src={imageUrl(media)} className="h-full w-full object-cover" autoPlay playsInline controls onEnded={next} />
        ) : (
          <Img src={media} alt={title} className="h-full w-full object-cover" />
        )}
        <button className="absolute left-0 top-16 h-[calc(100%-4rem)] w-1/3" onClick={prev} aria-label="prev" />
        <button className="absolute right-0 top-16 h-[calc(100%-4rem)] w-1/3" onClick={next} aria-label="next" />
      </div>
    </div>
  );
}
