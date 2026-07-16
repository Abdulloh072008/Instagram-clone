"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import ConnectedAccounts from "@/components/ConnectedAccounts";
import { profiles } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import type { UserProfile } from "@/lib/types";

export default function EditProfilePage() {
  const router = useRouter();
  const { setUserImage } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ about: string; gender: number }>();

  useEffect(() => {
    profiles.me().then((p) => {
      setProfile(p.data);
      // 0 = Male, 1 = Female (backend enum)
      reset({ about: p.data.about ?? "", gender: p.data.gender === "Female" ? 1 : 0 });
    });
  }, [reset]);

  async function onPickImage(f?: File) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    try {
      await profiles.updateImage(f);
      // pull the canonical new filename and broadcast it so avatars update without a refresh
      const p = await profiles.me();
      setProfile(p.data);
      setUserImage(p.data.image);
    } catch {
      setMsg("Image upload failed");
    }
  }

  const save = handleSubmit(async ({ about, gender }) => {
    setMsg("");
    try {
      await profiles.update(about, Number(gender));
      setMsg("Saved ✓");
      setTimeout(() => router.push("/profile"), 600);
    } catch {
      setMsg("Save failed");
    }
  });

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Edit profile</h1>

      <div className="mb-6 flex items-center gap-4 rounded-xl bg-elevated p-4">
        <Avatar src={preview ?? profile.image} name={profile.userName} size={64} />
        <div className="flex-1">
          <p className="font-semibold">{profile.userName}</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm font-semibold text-ig-blue"
          >
            Change photo
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
      </div>

      <label className="mb-1 block text-sm font-semibold">Bio</label>
      <textarea
        {...register("about")}
        rows={3}
        placeholder="Tell people about yourself…"
        className="mb-5 w-full resize-none rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
      />

      <label className="mb-1 block text-sm font-semibold">Gender</label>
      <select
        {...register("gender")}
        className="mb-6 w-full rounded-lg border border-line bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-neutral-500"
      >
        <option value={0}>Male</option>
        <option value={1}>Female</option>
      </select>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isSubmitting}
          className="rounded-lg bg-ig-blue px-5 py-2 text-sm font-semibold text-white hover:bg-ig-blue-hover disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Submit"}
        </button>
        {msg && <span className="text-sm text-neutral-400">{msg}</span>}
      </div>

      <p className="mt-6 text-xs text-neutral-600">
        Note: the backend only allows updating your photo, bio and gender.
      </p>

      <ConnectedAccounts />
    </div>
  );
}
