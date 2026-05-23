/**
 * Fondo "warp speed" — pantalla intro
 */
window.VibrartWarp = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  cx: 0,
  cy: 0,
  lines: [],
  t: 0,
  rafId: null,
  running: false,
  LINE_COUNT: 220,

  init() {
    this.canvas = document.getElementById('warp-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.start();
  },

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    this.canvas.width = this.w * devicePixelRatio;
    this.canvas.height = this.h * devicePixelRatio;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.initLines();
  },

  initLines() {
    this.lines = [];
    for (let i = 0; i < this.LINE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / this.LINE_COUNT + (Math.random() - 0.5) * 0.08;
      this.lines.push({
        angle,
        length: 0.3 + Math.random() * 0.7,
        speed: 0.4 + Math.random() * 1.2,
        offset: Math.random(),
        hue: Math.random() > 0.5 ? 'magenta' : 'cyan',
        width: 0.5 + Math.random() * 1.2,
      });
    }
  },

  color(hue, alpha) {
    if (hue === 'magenta') return `rgba(255, 0, 170, ${alpha})`;
    return `rgba(0, 229, 255, ${alpha})`;
  },

  draw() {
    if (!this.running) return;
    const { ctx, w, h, cx, cy, lines } = this;

    ctx.fillStyle = '#030510';
    ctx.fillRect(0, 0, w, h);

    const maxR = Math.hypot(w, h) * 0.65;

    for (const line of lines) {
      const progress = (this.t * line.speed * 0.02 + line.offset) % 1;
      const r0 = progress * maxR * 0.15;
      const r1 = r0 + line.length * maxR * (0.3 + progress * 0.7);

      const x0 = cx + Math.cos(line.angle) * r0;
      const y0 = cy + Math.sin(line.angle) * r0;
      const x1 = cx + Math.cos(line.angle) * r1;
      const y1 = cy + Math.sin(line.angle) * r1;

      const alpha = 0.15 + (1 - progress) * 0.55;
      ctx.strokeStyle = this.color(line.hue, alpha);
      ctx.lineWidth = line.width;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    this.t++;
    this.rafId = requestAnimationFrame(() => this.draw());
  },

  start() {
    if (!this.canvas || this.running) return;
    this.running = true;
    this.draw();
  },

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  },
};
