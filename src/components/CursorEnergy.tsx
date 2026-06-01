import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// CursorEnergy — a premium, cursor-reactive "blue energy" field.
//
// • Trailing particles with inertia (smoothed cursor lags behind the pointer).
// • Velocity-driven intensity: fast movement = more/brighter energy.
// • Two parallax depths + a soft electric core glow + light streaks.
// • Drives CSS vars (--px/--py) for background parallax and (--ex/--ey) for the
//   per-card hover spotlight (see .energy-card / .parallax-* in index.css).
//
// Performance: cached radial-gradient sprites (no per-frame shadowBlur), a
// single requestAnimationFrame loop, capped particle pool, DPR-aware.
// Accessibility: respects prefers-reduced-motion and only runs for fine
// pointers (mouse) — touch/mobile get the clean static layout, no overlay.
// The canvas is pointer-events:none and aria-hidden, so it never affects
// clicks, scrolling, focus, or screen readers.
// ─────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; depth: number;
}

function makeSprite(inner: string, outer: string): HTMLCanvasElement {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, outer);
  grad.addColorStop(1, "rgba(80,170,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

export function CursorEnergy() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    setActive(!reduce && fine);
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const glow = makeSprite("rgba(120,205,255,0.9)", "rgba(70,150,255,0.35)");
    const core = makeSprite("rgba(225,245,255,1)", "rgba(140,210,255,0.5)");

    // pointer state
    const target = { x: W / 2, y: H / 2 };
    const smooth = { x: W / 2, y: H / 2 };
    let prevX = smooth.x, prevY = smooth.y, speed = 0, seen = false;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX; target.y = e.clientY; seen = true;
      // hover spotlight: update local coords on the nearest energy card
      const el = (e.target as HTMLElement)?.closest?.(".energy-card") as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--ex", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--ey", `${((e.clientY - r.top) / r.height) * 100}%`);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const particles: Particle[] = [];
    const MAX = 140;
    const root = document.documentElement;
    let raf = 0;

    const spawn = (n: number, sp: number) => {
      const ang = Math.atan2(target.y - smooth.y, target.x - smooth.x);
      for (let i = 0; i < n && particles.length < MAX; i++) {
        const spread = (Math.random() - 0.5) * 0.9;
        const v = 0.4 + Math.random() * (sp * 0.18);
        const depth = Math.random();              // 0 = far, 1 = near
        particles.push({
          x: smooth.x + (Math.random() - 0.5) * 10,
          y: smooth.y + (Math.random() - 0.5) * 10,
          vx: Math.cos(ang + spread) * v + (Math.random() - 0.5) * 0.6,
          vy: Math.sin(ang + spread) * v + (Math.random() - 0.5) * 0.6,
          life: 1, max: 0.6 + Math.random() * 0.7,
          size: (4 + Math.random() * 7) * (0.5 + depth),
          depth,
        });
      }
    };

    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;

      // inertia: smoothed cursor lags behind the real pointer
      smooth.x += (target.x - smooth.x) * 0.16;
      smooth.y += (target.y - smooth.y) * 0.16;
      const dx = smooth.x - prevX, dy = smooth.y - prevY;
      const inst = Math.hypot(dx, dy);
      speed += (inst - speed) * 0.25;             // smoothed speed
      prevX = smooth.x; prevY = smooth.y;

      // parallax vars (-1..1 from viewport center) with easing baked in via lerp
      root.style.setProperty("--px", ((smooth.x / W) * 2 - 1).toFixed(3));
      root.style.setProperty("--py", ((smooth.y / H) * 2 - 1).toFixed(3));

      if (seen) spawn(Math.min(4, Math.floor(speed / 5)), speed);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // ambient core glow at the cursor, intensity scales with speed
      const coreR = Math.min(150, 54 + speed * 2.2);
      ctx.globalAlpha = Math.min(0.5, 0.18 + speed * 0.012);
      ctx.drawImage(glow, smooth.x - coreR, smooth.y - coreR, coreR * 2, coreR * 2);

      // light streak along the motion vector when moving quickly
      if (speed > 6) {
        ctx.globalAlpha = Math.min(0.4, speed * 0.02);
        const lg = ctx.createLinearGradient(prevX - dx * 6, prevY - dy * 6, smooth.x, smooth.y);
        lg.addColorStop(0, "rgba(90,180,255,0)");
        lg.addColorStop(1, "rgba(150,220,255,0.9)");
        ctx.strokeStyle = lg;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(prevX - dx * 6, prevY - dy * 6);
        ctx.lineTo(smooth.x, smooth.y);
        ctx.stroke();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.93; p.vy *= 0.93;
        p.life -= dt / p.max;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const a = p.life * (0.18 + p.depth * 0.22);
        const sz = p.size * (0.7 + (1 - p.life) * 0.6);
        ctx.globalAlpha = a;
        ctx.drawImage(glow, p.x - sz, p.y - sz, sz * 2, sz * 2);
        if (p.depth > 0.6) {                       // bright electric core on near layer
          ctx.globalAlpha = a * 1.3;
          const cs = sz * 0.4;
          ctx.drawImage(core, p.x - cs, p.y - cs, cs * 2, cs * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      root.style.removeProperty("--px");
      root.style.removeProperty("--py");
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
      style={{ mixBlendMode: "normal" }}
    />
  );
}
