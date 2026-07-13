"use client";

import { useEffect } from "react";
import PostCard from "./PostCard";
import type { Post } from "@/lib/types";
import { CloseIcon } from "./Icons";

export default function PostModal({
  post,
  onClose,
  isRepost = false,
  onDeleted,
}: {
  post: Post;
  onClose: () => void;
  isRepost?: boolean;
  onDeleted?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button className="absolute right-5 top-5 text-white/80 hover:text-white">
        <CloseIcon size={28} />
      </button>
      <div className="max-h-[90vh] w-full max-w-[470px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <PostCard post={post} isRepost={isRepost} onDeleted={onDeleted} />
      </div>
    </div>
  );
}
