"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { calls, type CallDto } from "@/lib/services";
import type { AuthUser } from "@/lib/types";
import { PhoneIcon } from "./Icons";

type CallType = "video" | "audio";

function useLocalCamera(video: boolean) {
  const ref = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(video);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video, audio: true })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (ref.current) ref.current.srcObject = s;
      })
      .catch(() => {});
    return () => { active = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [video]);

  const toggleCam = () => { const t = streamRef.current?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); } };
  const toggleMic = () => { const t = streamRef.current?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); } };
  return { ref, camOn, micOn, toggleCam, toggleMic };
}

function HangupGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="rotate-[135deg]">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z" />
    </svg>
  );
}

function InCallScreen({ callId, title, type, initial, onHangup }: {
  callId: number; title: string; type: CallType; initial: string; onHangup: () => void;
}) {
  const { ref, camOn, micOn, toggleCam, toggleMic } = useLocalCamera(type === "video");
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const iv = setInterval(() => {
      calls.get(callId).then((r) => {
        const s = r.data?.status;
        if (s === "accepted") setStatus("Connected");
        else if (s === "ringing") setStatus("Ringing…");
        else if (s === "ended" || s === "declined") onHangup();
      }).catch(() => {});
    }, 2500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  const hangup = () => { calls.end(callId).catch(() => {}); onHangup(); };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      {type === "video" ? (
        <video ref={ref} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-90" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><Avatar name={title} size={120} /></div>
      )}
      <div className="relative z-10 bg-gradient-to-b from-black/60 to-transparent p-6 text-center">
        <div className="text-2xl font-semibold">{title}</div>
        <div className="mt-1 text-sm opacity-80">{status}</div>
      </div>
      <div className="relative z-10 mt-auto flex items-center justify-center gap-5 bg-gradient-to-t from-black/70 to-transparent p-8">
        <button onClick={toggleMic} className={`grid h-12 w-12 place-items-center rounded-full ${micOn ? "bg-white/20" : "bg-white text-black"}`}>{micOn ? "🎙️" : "🔇"}</button>
        <button onClick={hangup} className="grid h-16 w-16 place-items-center rounded-full bg-ig-red"><HangupGlyph /></button>
        {type === "video" && (
          <button onClick={toggleCam} className={`grid h-12 w-12 place-items-center rounded-full ${camOn ? "bg-white/20" : "bg-white text-black"}`}>{camOn ? "📷" : "🚫"}</button>
        )}
      </div>
    </div>
  );
}

/** Исходящий звонок из чата. */
export function CallModal({ me, peerId, peerName, type, onClose }: {
  me: AuthUser; peerId: string; peerName: string; type: CallType; onClose: () => void;
}) {
  const [callId, setCallId] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    calls.start({ callerId: me.id, callerName: me.userName, calleeId: peerId, calleeName: peerName, type })
      .then((r) => { if (active) setCallId(r.data?.id ?? null); })
      .catch(() => setError(true));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error)
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-6 text-center text-white">
        <div>
          <p>Couldn&apos;t start the call (companion backend down).</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-white/20 px-4 py-2">Close</button>
        </div>
      </div>
    );

  if (callId == null)
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-black text-white">
        <div className="text-center">
          <Avatar name={peerName} size={96} />
          <div className="mt-4 text-xl font-semibold">{peerName}</div>
          <div className="mt-1 text-sm opacity-70">Connecting…</div>
        </div>
      </div>
    );

  return <InCallScreen callId={callId} title={peerName} type={type} initial="Ringing…" onHangup={onClose} />;
}

/** Следит за входящими звонками пользователя (монтируется в layout). */
export function IncomingCallWatcher({ me }: { me: AuthUser }) {
  const [incoming, setIncoming] = useState<CallDto | null>(null);
  const [inCall, setInCall] = useState<CallDto | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      if (inCall) return;
      calls.incoming(me.id).then((r) => setIncoming(r.data?.[0] ?? null)).catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [me.id, inCall]);

  if (inCall) return <InCallScreen callId={inCall.id} title={inCall.callerName} type={inCall.type} initial="Connected" onHangup={() => setInCall(null)} />;
  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black text-white">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar name={incoming.callerName} size={96} />
        <div className="mt-3 text-2xl font-semibold">{incoming.callerName}</div>
        <div className="text-sm opacity-70">Incoming {incoming.type} call…</div>
        <div className="mt-8 flex items-center gap-10">
          <button onClick={() => { calls.decline(incoming.id).catch(() => {}); setIncoming(null); }} className="flex flex-col items-center gap-1.5">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-ig-red"><HangupGlyph /></span>
            <span className="text-xs">Decline</span>
          </button>
          <button onClick={() => { calls.accept(incoming.id).then(() => { setInCall(incoming); setIncoming(null); }).catch(() => {}); }} className="flex flex-col items-center gap-1.5">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-green-500"><PhoneIcon size={24} /></span>
            <span className="text-xs">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
