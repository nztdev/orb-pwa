// visualEngine.js
// Signature element: a single breathing orb, present on every screen.
// Safety constraint (do not change without re-reading this comment):
// This engine NEVER flashes, strobes, or oscillates brightness at a fixed
// frequency. All motion is slow (breath-paced, ~4–8s cycles) and smooth
// (eased sine/perlin-like drift), which keeps it well outside the ~3–30Hz
// band associated with photosensitive seizure risk. If you're tempted to
// add "faster flicker for intensity," don't — increase drift/complexity
// instead (see `depthLevel`).

export class VisualEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.t = 0;
    this.breathPhase = 0;
    this.breathCycleSeconds = 6.4; // ~9.4 breaths/min, a calm, slow pace
    this.depthLevel = 2; // 1 (calm) - 3 (deep), never affects flicker rate
    this.running = true;
    this.particles = this._makeParticles(60);
    this._lastTs = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  setDepth(level) {
    this.depthLevel = Math.min(3, Math.max(1, level));
  }

  _resize() {
    const { innerWidth: w, innerHeight: h } = window;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.w = w;
    this.h = h;
  }

  _makeParticles(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        angle: (i / n) * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.5,
        speed: 0.08 + Math.random() * 0.05,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }

  _loop(ts) {
    if (!this.running) return;
    if (this._lastTs === null) this._lastTs = ts;
    // Real elapsed time, clamped so a backgrounded/throttled tab doesn't
    // cause a large jump when it resumes.
    const dt = Math.min((ts - this._lastTs) / 1000, 1 / 20);
    this._lastTs = ts;
    this.t += dt;
    this.breathPhase = (this.t % this.breathCycleSeconds) / this.breathCycleSeconds;

    this._draw();
    requestAnimationFrame(this._loop);
  }

  // Smooth 0..1..0 breathing curve, no sharp edges
  _breathValue() {
    return (Math.sin(this.breathPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }

  _draw() {
    const ctx = this.ctx;
    const { w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Slow fade instead of hard clear -> smooth trails, never a flash
    ctx.fillStyle = 'rgba(10, 14, 20, 0.16)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const breath = this._breathValue(); // 0..1 smooth
    const baseRadius = Math.min(w, h) * (0.10 + breath * 0.05);

    // Core orb glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 3);
    grad.addColorStop(0, `rgba(91, 140, 137, ${0.35 + breath * 0.15})`);
    grad.addColorStop(0.5, 'rgba(91, 140, 137, 0.08)');
    grad.addColorStop(1, 'rgba(91, 140, 137, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(232, 226, 212, ${0.75 + breath * 0.15})`;
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting particles — count/spread scales with depthLevel, speed never does
    const activeCount = Math.round(this.particles.length * (this.depthLevel / 3));
    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i];
      const angle = p.angle + this.t * p.speed;
      const wob = Math.sin(this.t * 0.3 + p.wobble) * 0.05;
      const r = baseRadius * (1.8 + p.radius * this.depthLevel) * (1 + wob);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.7; // slight ellipse, calmer than a circle
      const size = 1.4 + breath * 1.2;

      ctx.beginPath();
      ctx.fillStyle = `rgba(176, 139, 79, ${0.25 + breath * 0.2})`;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  stop() {
    this.running = false;
  }
}
