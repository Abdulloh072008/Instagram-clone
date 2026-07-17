"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { calls } from "@/lib/services";
import { createRingtone } from "@/lib/ringtone";
import { useAuth } from "@/lib/auth";
import { PhoneIcon, VideoIcon, MicIcon } from "./Icons";
import type { CallInfo, CallType } from "@/lib/types";

// Public STUN only. Same-machine and same-Wi-Fi calls connect; calls across
// different NATs need a TURN relay this project doesn't have, and will often
// fail to connect — see the grilling notes.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active";

type CallContextValue = {
  startCall: (peer: { id: string; name: string }, type: CallType) => void;
  busy: boolean;
};

const CallContext = createContext<CallContextValue>({ startCall: () => {}, busy: false });
export const useCall = () => useContext(CallContext);

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [call, setCall] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const sinceRef = useRef(0);
  const sigTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  // ICE-кандидаты, пришедшие ДО remoteDescription — держим, пока её не поставим.
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const ringRef = useRef<ReturnType<typeof createRingtone> | null>(null);

  const teardown = useCallback(() => {
    if (sigTimer.current) clearInterval(sigTimer.current);
    if (stateTimer.current) clearInterval(stateTimer.current);
    sigTimer.current = stateTimer.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCamOff(false);
    sinceRef.current = 0;
  }, []);

  const endLocally = useCallback(() => {
    teardown();
    setPhase("idle");
    setCall(null);
  }, [teardown]);

  // Bind streams to the media elements whenever they change. Remote audio always
  // plays through a dedicated <audio> sink so audio-only calls are audible too;
  // the remote <video> is muted to avoid the sound playing twice on video calls.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, phase]);
  useEffect(() => {
    const v = remoteVideoRef.current;
    if (v) {
      v.srcObject = remoteStream;
      if (remoteStream) v.play().catch(() => {});
    }
    const a = remoteAudioRef.current;
    if (a) {
      a.srcObject = remoteStream;
      if (remoteStream) a.play().catch(() => {});
    }
  }, [remoteStream, phase]);

  const createPC = useCallback(
    (callId: number, myId: string) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pc.onicecandidate = (e) => {
        if (e.candidate) calls.sendSignal(callId, myId, "ice", JSON.stringify(e.candidate)).catch(() => {});
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        setPhase("active");
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) endLocally();
      };
      pcRef.current = pc;
      return pc;
    },
    [endLocally],
  );

  const addLocalMedia = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
    localRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach((t) => pcRef.current?.addTrack(t, stream));
    return stream;
  }, []);

  // Flush ICE candidates that arrived before the remote description was set.
  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* stale candidate — ignore */
      }
    }
  }, []);

  // Apply one incoming signal to the peer connection.
  const applySignal = useCallback(
    async (callId: number, myId: string, kind: string, payload: string) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (kind === "offer") {
          await pc.setRemoteDescription(JSON.parse(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await calls.sendSignal(callId, myId, "answer", JSON.stringify(answer));
          await flushIce(pc);
        } else if (kind === "answer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(JSON.parse(payload));
            await flushIce(pc);
          }
        } else if (kind === "ice") {
          const cand = JSON.parse(payload) as RTCIceCandidateInit;
          // addIceCandidate throws if there's no remote description yet — buffer instead.
          if (pc.remoteDescription?.type) await pc.addIceCandidate(cand);
          else pendingIce.current.push(cand);
        }
      } catch {
        /* out-of-order or duplicate signal — ignore */
      }
    },
    [flushIce],
  );

  const startSignalPoll = useCallback(
    (callId: number, myId: string) => {
      if (sigTimer.current) clearInterval(sigTimer.current);
      sigTimer.current = setInterval(async () => {
        try {
          const res = await calls.getSignals(callId, myId, sinceRef.current);
          for (const s of res.data ?? []) {
            sinceRef.current = Math.max(sinceRef.current, s.id);
            if (s.fromUserId !== myId) await applySignal(callId, myId, s.kind, s.payload);
          }
        } catch {
          /* transient */
        }
      }, 1000);
    },
    [applySignal],
  );

  const startStatePoll = useCallback(
    (callId: number) => {
      if (stateTimer.current) clearInterval(stateTimer.current);
      stateTimer.current = setInterval(async () => {
        try {
          const res = await calls.get(callId);
          const info = res.data;
          if (!info) return;
          setCall(info);
          if (info.status === "ended" || info.status === "declined") endLocally();
          else if (info.status === "accepted") setPhase((p) => (p === "outgoing" ? "connecting" : p));
        } catch {
          /* transient */
        }
      }, 2000);
    },
    [endLocally],
  );

  const startCall = useCallback(
    async (peer: { id: string; name: string }, type: CallType) => {
      if (!user || phase !== "idle") return;
      try {
        const res = await calls.start(user, peer, type);
        const info = res.data;
        if (!info) return;
        setCall(info);
        setPhase("outgoing");
        const pc = createPC(info.id, user.id);
        await addLocalMedia(type);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await calls.sendSignal(info.id, user.id, "offer", JSON.stringify(offer));
        startSignalPoll(info.id, user.id);
        startStatePoll(info.id);
      } catch {
        endLocally();
      }
    },
    [user, phase, createPC, addLocalMedia, startSignalPoll, startStatePoll, endLocally],
  );

  const accept = useCallback(async () => {
    if (!user || !call) return;
    try {
      await calls.accept(call.id);
      setPhase("connecting");
      createPC(call.id, user.id);
      await addLocalMedia(call.type);
      startSignalPoll(call.id, user.id);
      startStatePoll(call.id);
    } catch {
      endLocally();
    }
  }, [user, call, createPC, addLocalMedia, startSignalPoll, startStatePoll, endLocally]);

  const decline = useCallback(() => {
    if (call) calls.decline(call.id).catch(() => {});
    endLocally();
  }, [call, endLocally]);

  const hangup = useCallback(() => {
    if (call) calls.end(call.id).catch(() => {});
    endLocally();
  }, [call, endLocally]);

  // Global incoming-call poll: only while idle and logged in.
  useEffect(() => {
    if (!user || phase !== "idle") return;
    let stop = false;
    const check = async () => {
      try {
        const res = await calls.incoming(user.id);
        const ringing = (res.data ?? []).find((c) => c.status === "ringing");
        if (ringing && !stop) {
          setCall(ringing);
          setPhase("incoming");
        }
      } catch {
        /* transient */
      }
    };
    check();
    const t = setInterval(check, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [user, phase]);

  // Ring while a call is being established, stop once connected or over.
  useEffect(() => {
    ringRef.current ??= createRingtone();
    const ring = ringRef.current;
    if (phase === "incoming" || phase === "outgoing") ring.start();
    else ring.stop();
    return () => ring.stop();
  }, [phase]);

  // Tear the call down if the tab closes mid-call.
  useEffect(() => {
    const onUnload = () => {
      if (call && phase !== "idle") calls.end(call.id).catch(() => {});
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [call, phase]);

  function toggleMute() {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }
  function toggleCam() {
    const next = !camOff;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  }

  // The other party is whichever side isn't me.
  const peerName = call ? (call.callerId === user?.id ? call.calleeName : call.callerName) : "";
  const isVideo = call?.type === "video";

  return (
    <CallContext.Provider value={{ startCall, busy: phase !== "idle" }}>
      {children}

      {/* Incoming ringer */}
      {phase === "incoming" && call && (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-6 bg-black/90">
          <Avatar src={null} name={call.callerName} size={96} />
          <div className="text-center">
            <p className="text-xl font-semibold">{call.callerName}</p>
            <p className="text-sm text-neutral-400">Incoming {call.type} call…</p>
          </div>
          <div className="flex gap-8">
            <button
              onClick={decline}
              aria-label="Decline"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600"
            >
              <PhoneIcon size={26} className="rotate-135" />
            </button>
            <button
              onClick={accept}
              aria-label="Accept"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600"
            >
              {isVideo ? <VideoIcon size={26} /> : <PhoneIcon size={26} />}
            </button>
          </div>
        </div>
      )}

      {/* Active / outgoing call overlay */}
      {(phase === "outgoing" || phase === "connecting" || phase === "active") && call && (
        <div className="fixed inset-0 z-60 flex flex-col bg-neutral-950">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {/* Remote video — mounted for the whole video call so the ref binds
                reliably; hidden until the stream arrives. Muted on purpose: sound
                plays through the <audio> sink below (which also covers voice calls). */}
            {isVideo && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${remoteStream ? "" : "hidden"}`}
              />
            )}
            {(!isVideo || !remoteStream) && (
              <div className="flex flex-col items-center gap-4">
                <Avatar src={null} name={peerName} size={112} />
                <p className="text-xl font-semibold">{peerName}</p>
                <p className="text-sm text-neutral-400">
                  {phase === "active" ? "Connected" : phase === "connecting" ? "Connecting…" : "Ringing…"}
                </p>
              </div>
            )}

            {/* local preview */}
            {isVideo && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 h-40 w-28 rounded-lg border border-line object-cover"
              />
            )}

            {/* Remote audio sink — always mounted so BOTH voice and video calls have sound. */}
            <audio ref={remoteAudioRef} autoPlay />
          </div>

          {/* controls */}
          <div className="flex items-center justify-center gap-6 py-6">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                muted ? "bg-white text-black" : "bg-neutral-800 text-white"
              }`}
            >
              <MicIcon size={22} />
            </button>
            {isVideo && (
              <button
                onClick={toggleCam}
                aria-label={camOff ? "Camera on" : "Camera off"}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  camOff ? "bg-white text-black" : "bg-neutral-800 text-white"
                }`}
              >
                <VideoIcon size={22} />
              </button>
            )}
            <button
              onClick={hangup}
              aria-label="End call"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600"
            >
              <PhoneIcon size={22} className="rotate-135" />
            </button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}
