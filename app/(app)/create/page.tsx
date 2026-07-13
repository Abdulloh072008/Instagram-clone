"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { posts as postsApi } from "@/lib/services";
import { ImageIcon, VideoIcon, CloseIcon } from "@/components/Icons";

export default function CreatePage() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ title: string; content: string }>();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (!arr.length) return;
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeAt(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  const submit = handleSubmit(async ({ title, content }) => {
    if (files.length === 0) {
      setError("root", { message: "Add at least one photo or video" });
      return;
    }
    try {
      await postsApi.create(title, content, files);
      router.push("/profile");
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Failed to create post" });
    }
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Create new post</h1>
        <button
          onClick={submit}
          disabled={isSubmitting || files.length === 0}
          className="rounded-lg bg-ig-blue px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-ig-blue-hover disabled:opacity-50"
        >
          {isSubmitting ? "Sharing…" : "Share"}
        </button>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="rounded-xl border border-dashed border-line bg-elevated p-4"
      >
        {previews.length === 0 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-4 text-neutral-400">
            <span className="text-sm">Drag photos or videos here, or</span>
            <div className="flex gap-3">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm hover:bg-neutral-900"
              >
                <ImageIcon size={20} /> Add photos
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm hover:bg-neutral-900"
              >
                <VideoIcon size={20} /> Add videos
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-black">
                {files[i]?.type.startsWith("video/") ? (
                  <video src={src} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ))}
            <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-line text-neutral-400">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs hover:text-white"
              >
                <ImageIcon size={20} /> Photo
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs hover:text-white"
              >
                <VideoIcon size={20} /> Video
              </button>
            </div>
          </div>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <input
        {...register("title")}
        placeholder="Title"
        className="mt-4 w-full rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
      />
      <textarea
        {...register("content")}
        placeholder="Write a caption…"
        rows={4}
        className="mt-2 w-full resize-none rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
      />
      {errors.root && <p className="mt-2 text-sm text-ig-red">{errors.root.message}</p>}
    </div>
  );
}
