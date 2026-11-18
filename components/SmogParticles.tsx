"use client";
// Slow-drifting soft particles over the scene; density and opacity follow the AQI.
import { useEffect, useRef } from "react";

export function SmogParticles({ smog, subtle = false }: { smog: number; subtle?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const count = Math.round((25 + smog * 140) * (subtle ? 0.6 : 1));
    const ps = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2.5 + (Math.random() < (subtle ? 0.04 : 0.15) ? 18 + Math.random() * 40 : 0), // a few large haze puffs
      vx: 4 + Math.random() * 10,
      vy: (Math.random() - 0.5) * 3,
      a: 0.08 + Math.random() * 0.25,
    }));

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x - p.r > w) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        if (p.y > h + p.r) p.y = -p.r;
        const big = p.r > 10;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const alpha = (big ? 0.18 : p.a) * (0.4 + smog) * (subtle ? 0.55 : 1);
        g.addColorStop(0, `rgba(196,186,170,${alpha})`);
        g.addColorStop(1, "rgba(196,186,170,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [smog, subtle]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
