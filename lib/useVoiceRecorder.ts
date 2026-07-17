import { useCallback, useRef, useState } from "react";

// Pick a container the browser can both record AND play back. Chrome records
// webm/opus; Safari only does mp4/aac and can't decode webm at all — so
// negotiate rather than hard-coding webm, or Safari users get silent clips.
function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

/**
 * Minimal hold-to-record voice recorder. `start` asks for the mic and begins;
 * `stop` resolves the recorded blob and its length; `cancel` discards. Returns
 * null when there's nothing usable (denied mic, empty clip).
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.start();
      recRef.current = rec;
      startedRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(
        () => setSeconds(Math.floor((Date.now() - startedRef.current) / 1000)),
        250,
      );
      return true;
    } catch {
      cleanup();
      return false;
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<{ blob: Blob; seconds: number } | null> => {
    return new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec) {
        cleanup();
        resolve(null);
        return;
      }
      const secs = Math.max(1, Math.round((Date.now() - startedRef.current) / 1000));
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        cleanup();
        resolve(blob.size ? { blob, seconds: secs } : null);
      };
      rec.stop();
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    const rec = recRef.current;
    chunksRef.current = [];
    if (rec && rec.state !== "inactive") {
      rec.onstop = () => cleanup();
      rec.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  return { recording, seconds, start, stop, cancel };
}
