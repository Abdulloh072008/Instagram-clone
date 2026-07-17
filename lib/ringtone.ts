// A synthesized call ring, so there's no audio asset to bundle or host. Plays
// the familiar two-tone "ring… ring…" cadence on a loop until stopped.
//
// Note: browsers may block audio that starts without a user gesture, so an
// incoming ring can be silent until the page has been interacted with. The
// outgoing ring always follows a click (placing the call), so it plays.
export function createRingtone() {
  let ctx: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function beep(at: number, dur: number, freq: number) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    // Soft attack/release so it doesn't click.
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.12, at + 0.03);
    gain.gain.setValueAtTime(0.12, at + dur - 0.05);
    gain.gain.linearRampToValueAtTime(0, at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur);
  }

  function ring() {
    if (!ctx) return;
    const t = ctx.currentTime;
    beep(t, 0.4, 480);
    beep(t + 0.5, 0.4, 440);
  }

  function start() {
    if (ctx) return;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      ctx = new Ctor();
    } catch {
      return;
    }
    void ctx.resume?.();
    ring();
    timer = setInterval(ring, 3000);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    void ctx?.close();
    ctx = null;
  }

  return { start, stop };
}
