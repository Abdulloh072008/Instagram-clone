"use client";

import { useRef, useState } from "react";
import GifPicker from "./GifPicker";
import StickerPicker from "./StickerPicker";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { ImageIcon, ShareIcon, SmileIcon, MicIcon, StickerIcon, CloseIcon, TrashIcon } from "./Icons";
import type { GifItem } from "@/lib/types";

const EMOJI = ["😀","😂","🥰","😍","😎","😭","😊","👍","🙏","🔥","❤️","💯","🎉","😅","🤔","😢","😡","🥳","👏","✨","😴","🤩","😜","🙌"];

type Panel = "none" | "emoji" | "gif" | "sticker";

export default function Composer({
  onText,
  onGif,
  onSticker,
  onVoice,
}: {
  onText: (text: string, file: File | null) => void;
  onGif: (gif: GifItem) => void;
  onSticker: (url: string) => void;
  onVoice: (blob: Blob, seconds: number) => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

  function submitText() {
    if (!text.trim() && !file) return;
    onText(text.trim(), file);
    setText("");
    setFile(null);
    setPanel("none");
  }

  async function stopAndSend() {
    const res = await voice.stop();
    if (res) onVoice(res.blob, res.seconds);
  }

  const clock = `${Math.floor(voice.seconds / 60)}:${String(voice.seconds % 60).padStart(2, "0")}`;

  // While recording, the whole bar becomes the recording UI.
  if (voice.recording) {
    return (
      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <button onClick={voice.cancel} aria-label="Cancel recording" className="text-neutral-300">
          <TrashIcon size={22} />
        </button>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-sm tabular-nums text-neutral-300">Recording… {clock}</span>
        <button
          onClick={stopAndSend}
          className="ml-auto font-semibold text-ig-blue"
        >
          Send
        </button>
      </div>
    );
  }

  const canSend = !!text.trim() || !!file;

  return (
    <div className="border-t border-line">
      {panel === "emoji" && (
        <div className="grid grid-cols-8 gap-1 border-b border-line p-3 text-2xl">
          {EMOJI.map((e) => (
            <button key={e} onClick={() => setText((t) => t + e)} className="rounded p-1 hover:bg-neutral-800">
              {e}
            </button>
          ))}
        </div>
      )}
      {panel === "gif" && (
        <div className="border-b border-line">
          <GifPicker
            onPick={(g) => {
              onGif(g);
              setPanel("none");
            }}
          />
        </div>
      )}
      {panel === "sticker" && (
        <div className="border-b border-line">
          <StickerPicker
            onPick={(url) => {
              onSticker(url);
              setPanel("none");
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => togglePanel("emoji")}
          aria-label="Emoji"
          className={panel === "emoji" ? "text-white" : "text-neutral-300"}
        >
          <SmileIcon size={24} />
        </button>

        <div className="flex flex-1 items-center gap-2 rounded-full border border-line px-4 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitText();
              }
            }}
            placeholder={file ? `📎 ${file.name}` : "Message…"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          {file && (
            <button onClick={() => setFile(null)} aria-label="Remove attachment" className="text-neutral-400">
              <CloseIcon size={16} />
            </button>
          )}
        </div>

        {canSend ? (
          <button onClick={submitText} className="font-semibold text-ig-blue">
            <ShareIcon size={24} />
          </button>
        ) : (
          <div className="flex items-center gap-4 text-neutral-300">
            <button type="button" onClick={() => togglePanel("gif")} aria-label="GIF" className={panel === "gif" ? "text-white" : ""}>
              <span className="text-xs font-bold">GIF</span>
            </button>
            <button type="button" onClick={() => togglePanel("sticker")} aria-label="Sticker" className={panel === "sticker" ? "text-white" : ""}>
              <StickerIcon size={24} />
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Photo">
              <ImageIcon size={24} />
            </button>
            <button type="button" onClick={voice.start} aria-label="Record voice">
              <MicIcon size={24} />
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
