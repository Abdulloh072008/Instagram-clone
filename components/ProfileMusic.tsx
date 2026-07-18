"use client";

import { useEffect, useRef, useState } from "react";
import { music, type TrackDto, type ProfileMusicDto } from "@/lib/services";

/**
 * «Музыка в профиле» — как в реальном Instagram: закрепляешь трек, другие
 * заходят и нажимают play, играет 30-сек превью (iTunes). Один трек на профиль.
 */
export default function ProfileMusic({ userId, isMe }: { userId: string; isMe: boolean }) {
  const [track, setTrack] = useState<ProfileMusicDto | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    music.get(userId).then((r) => setTrack(r.data ?? null)).catch(() => {});
  }, [userId]);

  // Гасим звук при уходе со страницы / смене профиля.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [userId]);

  function toggle() {
    if (!track?.previewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  async function pin(t: TrackDto) {
    const r = await music.set(userId, t).catch(() => null);
    if (r?.data) setTrack(r.data);
    setDialogOpen(false);
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }

  async function remove() {
    await music.remove(userId).catch(() => {});
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setTrack(null);
  }

  if (!track && !isMe) return null; // на чужом профиле без музыки — ничего

  return (
    <div className="mt-1">
      {track ? (
        <div className="inline-flex items-center gap-3 rounded-full border border-line bg-elevated py-1.5 pl-1.5 pr-3">
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full"
          >
            {track.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-neutral-800">♪</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              {playing ? <PauseGlyph /> : <PlayGlyph />}
            </span>
          </button>
          <div className="min-w-0 max-w-[180px] leading-tight">
            <p className="truncate text-sm font-semibold">{track.trackName}</p>
            <p className="truncate text-xs text-neutral-400">{track.artistName}</p>
          </div>
          {isMe && (
            <div className="ml-1 flex items-center gap-2 border-l border-line pl-2 text-xs">
              <button onClick={() => setDialogOpen(true)} className="font-semibold text-ig-blue">
                Change
              </button>
              <button onClick={remove} className="font-semibold text-ig-red">
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-elevated px-4 py-2 text-sm font-semibold hover:bg-neutral-800"
        >
          <NoteGlyph /> Add music to your profile
        </button>
      )}

      {dialogOpen && <MusicSearchDialog onClose={() => setDialogOpen(false)} onPick={pin} />}
    </div>
  );
}

function MusicSearchDialog({ onClose, onPick }: { onClose: () => void; onPick: (t: TrackDto) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TrackDto[]>([]);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      music
        .search(term)
        .then((r) => setResults(r.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    return () => {
      previewRef.current?.pause();
      previewRef.current = null;
    };
  }, []);

  function preview(t: TrackDto) {
    if (previewing === t.previewUrl) {
      previewRef.current?.pause();
      setPreviewing(null);
      return;
    }
    previewRef.current?.pause();
    previewRef.current = new Audio(t.previewUrl);
    previewRef.current.onended = () => setPreviewing(null);
    previewRef.current.play().then(() => setPreviewing(t.previewUrl)).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-line bg-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line p-4">
          <h3 className="mb-3 text-base font-semibold">Add music</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a song or artist…"
            autoFocus
            className="w-full rounded-lg border border-line bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <p className="p-4 text-center text-sm text-neutral-500">Searching…</p>}
          {!loading && q.trim() && results.length === 0 && (
            <p className="p-4 text-center text-sm text-neutral-500">Nothing found</p>
          )}
          {results.map((t) => (
            <div key={t.previewUrl} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-900">
              <button
                onClick={() => preview(t)}
                aria-label="Preview"
                className="relative h-11 w-11 shrink-0 overflow-hidden rounded"
              >
                {t.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.artworkUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-neutral-800">♪</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  {previewing === t.previewUrl ? <PauseGlyph /> : <PlayGlyph />}
                </span>
              </button>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-medium">{t.trackName}</p>
                <p className="truncate text-xs text-neutral-500">{t.artistName}</p>
              </div>
              <button
                onClick={() => onPick(t)}
                className="rounded-md bg-ig-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-ig-blue-hover"
              >
                Pin
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-line p-3 text-right">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function NoteGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
