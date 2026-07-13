"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { posts as postsApi } from "@/lib/services";
import { ImageIcon, CloseIcon } from "@/components/Icons";

export default function CreatePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
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
      setError("root", { message: "Add at least one image" });
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
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-64 w-full flex-col items-center justify-center gap-3 text-neutral-400"
          >
            <ImageIcon size={56} />
            <span className="text-sm">Drag photos here or click to select</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-lg border border-line text-neutral-400 hover:bg-neutral-900"
            >
              <ImageIcon size={28} />
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
