"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { callApi, reactionApi, getCurrentUser, mediaUrl, type Call, type PostReactions, type CurrentUser, type Reel } from "@/lib/api";
import { Icon, Avatar } from "./ui";

// ── авто-проигрывание рилса при попадании в экран (как в оригинале) ───────────

export function AutoReel({ reel, onComments, onLike, onFollow }: {
  reel: Reel;
  onComments: () => void;
  onLike: () => void;
  onFollow: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const isVideo = /\.(mp4|webm|mov)$/i.test(reel.images ?? "");

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          v.play().then(() => setPaused(false)).catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  return (
    <div className="relative w-full max-w-[380px] aspect-[9/16] rounded-xl overflow-hidden bg-black shrink-0 snap-center">
      {isVideo ? (
        <video ref={ref} src={mediaUrl(reel.images)} loop muted={muted} playsInline preload="metadata" onClick={toggle} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(reel.images)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* центральная кнопка play при паузе */}
      {paused && isVideo && (
        <button onClick={toggle} className="absolute inset-0 grid place-items-center">
          <span className="w-16 h-16 rounded-full bg-black/40 grid place-items-center text-white">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}

      {/* звук */}
      {isVideo && (
        <button onClick={() => setMuted((m) => !m)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 grid place-items-center text-white text-xs">
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {/* правый рельс */}
      <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-5 text-white">
        <button className="flex flex-col items-center gap-1 hover:opacity-70 transition" onClick={onLike}>
          <Icon name="heart" size={28} fill={reel.postLike} className={reel.postLike ? "text-[#ed4956]" : ""} />
          <span className="text-xs">{reel.postLikeCount}</span>
        </button>
        <button className="flex flex-col items-center gap-1 hover:opacity-70 transition" onClick={onComments}>
          <Icon name="comment" size={28} />
          <span className="text-xs">{reel.commentCount}</span>
        </button>
      </div>

      {/* автор снизу */}
      <div className="absolute left-0 bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black/70 to-transparent text-white">
        <div className="flex items-center gap-2.5">
          <Avatar src={reel.userImage} name={reel.userName} size={32} />
          <b className="text-sm">{reel.userName}</b>
          {!reel.isSubscriber && (
            <button className="ml-1 px-2 py-1 text-xs font-semibold border border-white/70 rounded-md hover:bg-white/10 transition" onClick={onFollow}>Подписаться</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── камера ───────────────────────────────────────────────────────────────────

function useLocalCamera() {
  const ref = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (ref.current) ref.current.srcObject = s;
      })
      .catch(() => {});
    return () => { active = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const toggleCam = () => { const t = streamRef.current?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); } };
  const toggleMic = () => { const t = streamRef.current?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); } };
  return { ref, camOn, micOn, toggleCam, toggleMic };
}

function InCallScreen({ callId, title, initial, onHangup }: { callId: number; title: string; initial: string; onHangup: () => void }) {
  const { ref: camRef, camOn, micOn, toggleCam, toggleMic } = useLocalCamera();
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const iv = setInterval(() => {
      callApi.getCall(callId).then((r) => {
        const s = r.data?.status;
        if (s === "accepted") setStatus("На связи");
        else if (s === "ringing") setStatus("Вызов…");
        else if (s === "ended" || s === "declined") onHangup();
      }).catch(() => {});
    }, 2500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  const hangup = () => { callApi.endCall(callId).catch(() => {}); onHangup(); };

  return (
    <div className="fixed inset-0 z-[60] bg-[#111] text-white flex flex-col">
      <video ref={camRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-90" />
      <div className="relative z-10 p-6 text-center bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-2xl font-semibold">{title}</div>
        <div className="text-sm opacity-80 mt-1">{status}</div>
      </div>
      <div className="relative z-10 mt-auto p-8 flex items-center justify-center gap-5 bg-gradient-to-t from-black/70 to-transparent">
        <button onClick={toggleMic} className={"w-12 h-12 rounded-full grid place-items-center " + (micOn ? "bg-white/20" : "bg-white text-black")}>
          {micOn ? "🎙️" : "🔇"}
        </button>
        <button onClick={hangup} className="w-16 h-16 rounded-full bg-[#ed4956] grid place-items-center rotate-[135deg]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z" /></svg>
        </button>
        <button onClick={toggleCam} className={"w-12 h-12 rounded-full grid place-items-center " + (camOn ? "bg-white/20" : "bg-white text-black")}>
          {camOn ? "📷" : "🚫"}
        </button>
      </div>
    </div>
  );
}

/** Исходящий видеозвонок. */
export function CallModal({ me, peerId, peerName, onClose }: { me: CurrentUser; peerId: string; peerName: string; onClose: () => void }) {
  const [callId, setCallId] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    callApi.startCall({ callerId: me.userId, callerName: me.userName, calleeId: peerId, calleeName: peerName, type: "video" })
      .then((r) => { if (active) setCallId(r.data.id); })
      .catch(() => setError(true));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error)
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 grid place-items-center text-white p-6 text-center">
        <div>
          <div>Не удалось начать звонок (доп-бэкенд недоступен).</div>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-white/20">Закрыть</button>
        </div>
      </div>
    );

  if (callId == null)
    return (
      <div className="fixed inset-0 z-[60] bg-[#111] text-white grid place-items-center">
        <div className="text-center">
          <Avatar name={peerName} size={88} />
          <div className="text-xl font-semibold mt-4">{peerName}</div>
          <div className="text-sm opacity-70 mt-1">Соединение…</div>
        </div>
      </div>
    );

  return <InCallScreen callId={callId} title={peerName} initial="Вызов…" onHangup={onClose} />;
}

/** Следит за входящими звонками и показывает приглашение. */
export function IncomingCallWatcher({ me }: { me: CurrentUser }) {
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [inCall, setInCall] = useState<Call | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      if (inCall) return;
      callApi.getIncomingCalls(me.userId).then((r) => {
        const c = r.data?.[0] ?? null;
        setIncoming(c);
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [me.userId, inCall]);

  if (inCall) return <InCallScreen callId={inCall.id} title={inCall.callerName} initial="На связи" onHangup={() => setInCall(null)} />;
  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#111] text-white grid place-items-center">
      <div className="text-center flex flex-col items-center gap-2">
        <Avatar name={incoming.callerName} size={96} />
        <div className="text-2xl font-semibold mt-3">{incoming.callerName}</div>
        <div className="text-sm opacity-70">Входящий {incoming.type === "video" ? "видеозвонок" : "звонок"}…</div>
        <div className="flex items-center gap-10 mt-8">
          <button onClick={() => { callApi.declineCall(incoming.id).catch(() => {}); setIncoming(null); }} className="flex flex-col items-center gap-1.5">
            <span className="w-16 h-16 rounded-full bg-[#ed4956] grid place-items-center rotate-[135deg]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z" /></svg>
            </span>
            <span className="text-xs">Отклонить</span>
          </button>
          <button onClick={() => { callApi.acceptCall(incoming.id).then(() => { setInCall(incoming); setIncoming(null); }).catch(() => {}); }} className="flex flex-col items-center gap-1.5">
            <span className="w-16 h-16 rounded-full bg-[#2ecc71] grid place-items-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z" /></svg>
            </span>
            <span className="text-xs">Принять</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── эмодзи ───────────────────────────────────────────────────────────────────

const EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "😭", "😅", "🤔", "😮", "🔥", "❤️", "👍", "🙏", "🎉", "💯", "👏", "✨", "💔", "😢", "😡", "🥳", "😴", "🤝", "👀"];

export function EmojiButton({ onPick, size = 20 }: { onPick: (e: string) => void; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="opacity-60 hover:opacity-100 transition" title="Эмодзи">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 0 0 8 0" /><path d="M9 9h.01M15 9h.01" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 right-0 z-20 grid grid-cols-6 gap-0.5 p-2 rounded-xl border border-[#dbdbdb] dark:border-[#363636] bg-white dark:bg-black shadow-xl w-56">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { onPick(e); setOpen(false); }} className="text-xl leading-none p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">{e}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Панель эмодзи-реакций поста (данные — в доп-бэкенде). */
export function ReactionBar({ postId }: { postId: number }) {
  const [info, setInfo] = useState<PostReactions | null>(null);
  const me = getCurrentUser();

  const load = useCallback(() => {
    reactionApi.getReactions(postId, me?.userId).then((r) => setInfo(r.data)).catch(() => {});
  }, [postId, me?.userId]);
  useEffect(() => { load(); }, [load]);

  const react = (emoji: string) => {
    if (!me) return;
    if (info?.mine === emoji) reactionApi.removeReaction(me.userId, postId).then(load).catch(() => {});
    else reactionApi.addReaction({ userId: me.userId, userName: me.userName, postId, emoji }).then(load).catch(() => {});
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {info?.summary.map((s) => (
        <button key={s.emoji} onClick={() => react(s.emoji)}
          className={"px-2 py-0.5 rounded-full text-sm border transition " + (info.mine === s.emoji ? "border-[#0095f6] bg-[#0095f6]/10" : "border-[#dbdbdb] dark:border-[#363636] hover:bg-black/5 dark:hover:bg-white/10")}>
          {s.emoji} {s.count}
        </button>
      ))}
      <EmojiButton onPick={react} size={22} />
    </div>
  );
}
