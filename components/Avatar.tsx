"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/config";
import { initial, seedGradient } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  /** false = no ring, true = unseen gradient ring, "seen" = grey ring. */
  ring?: boolean | "seen";
  className?: string;
}

export default function Avatar({ src, name, size = 40, ring = false, className = "" }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const url = imageUrl(src);
  const showImg = url && !broken;

  const inner = (
    <div
      className={`relative overflow-hidden rounded-full bg-neutral-800 ${className}`}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name ?? "avatar"}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-semibold text-white"
          style={{ background: seedGradient(name ?? "u"), fontSize: size * 0.42 }}
        >
          {initial(name)}
        </div>
      )}
    </div>
  );

  if (!ring) return inner;

  return (
    <div
      className={`${ring === "seen" ? "story-ring-seen" : "story-ring"} rounded-full p-[2px]`}
      style={{ width: size + 6, height: size + 6 }}
    >
      <div className="rounded-full bg-black p-[2px]">{inner}</div>
    </div>
  );
}
