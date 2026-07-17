// A synthesized call ring, so there's no audio asset to bundle or host. Rather
// than a flat phone beep it plays a soft bell arpeggio (a rising major triad
// with a struck, decaying timbre), repeated with a rest — a friendly modern
// ring tone.
//
// Note: browsers may block audio that starts without a user gesture, so an
// incoming ring can be silent until the page has been interacted with. The
// outgoing ring always follows a click (placing the call), so it plays.
export function createRingtone() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  // One struck bell note: a fundamental plus a quieter high partial for shimmer,
  // with a fast attack and a long exponential decay so it rings rather than beeps.
  function bell(at: number, freq: number, dur: number, peak = 0.16) {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const partial = ctx.createOscillator();
    const g = ctx.createGain();
    const pg = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    partial.type = "sine";
    partial.frequency.value = freq * 2.01; // slight detune -> bell-like shimmer
    pg.gain.value = 0.3;

    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008); // quick strike
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur); // long ring-out

    osc.connect(g);
    partial.connect(pg).connect(g);
    g.connect(master);
    osc.start(at);
    partial.start(at);
    osc.stop(at + dur);
    partial.stop(at + dur);
  }

  // Rising major triad (E5, G#5, B5) then a soft repeat of the top note.
  function ring() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const notes = [659.25, 830.61, 987.77];
    notes.forEach((f, i) => bell(t + i * 0.16, f, 1.0));
    bell(t + 0.62, 987.77, 1.2, 0.1);
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
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    void ctx.resume?.();
    ring();
    timer = setInterval(ring, 2600); // ring … rest … ring
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    void ctx?.close();
    ctx = null;
    master = null;
  }

  return { start, stop };
}
