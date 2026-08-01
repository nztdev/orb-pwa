// audioEngine.js
// Safety constraint: this engine plays ONE tone, identical in both ears.
// It intentionally does NOT do dichotic playback (different content per ear)
// or binaural-beat hemisphere entrainment. If a future contributor wants to
// add spatial audio, keep it symmetric and disclosed in the UI — no
// left/right divergence designed to overload attention.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.mode = 'low'; // 'low' | 'mid' | 'none'
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.mode === 'none') return;
    const ctx = this._ensureContext();

    const freq = this.mode === 'low' ? 110 : 220; // simple, single, calm tone
    this.osc = ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.value = freq;

    this.gain = ctx.createGain();
    this.gain.gain.value = 0;

    // Gentle low-pass so it stays soft, not sharp
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this.osc.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(ctx.destination); // mono path -> identical in both ears

    this.osc.start();
    this.gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2.5);
  }

  stop(fadeSeconds = 1.5) {
    if (!this.ctx || !this.gain || !this.osc) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    const osc = this.osc;
    setTimeout(() => {
      try { osc.stop(); } catch (e) {}
    }, fadeSeconds * 1000 + 100);
    this.osc = null;
  }
}
