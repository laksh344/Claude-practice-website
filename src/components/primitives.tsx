import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function Logo({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-primary shadow-soft">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
          <path d="M12 3L3 8l9 5 9-5-9-5z" fill="white" />
          <path d="M3 13l9 5 9-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </svg>
      </div>
      <span className={`text-[17px] font-bold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
        Claude<span className="font-semibold text-muted-foreground"> Academy</span>
      </span>
    </div>
  );
}

export function ProgressRing({
  value, size = 160, stroke = 12, color = "hsl(var(--primary))", track = "hsl(var(--secondary))",
  label, sublabel, big = true,
}: {
  value: number; size?: number; stroke?: number; color?: string; track?: string;
  label?: string; sublabel?: string; big?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setShown(value); return; }
    let raf = 0; const start = performance.now(); const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <div ref={ref} className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={inView ? { strokeDashoffset: c - (shown / 100) * c } : {}}
          transition={{ duration: 0 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={`${big ? "text-4xl" : "text-2xl"} font-bold tracking-tight tabular-nums`}>
            {shown}<span className="text-muted-foreground text-[0.5em] font-semibold align-top">{label ?? "%"}</span>
          </div>
          {sublabel && <div className="mt-0.5 text-xs font-medium text-muted-foreground">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

export function Reveal({ children, delay = 0, y = 18 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Bar({ value, color = "hsl(var(--primary))" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export function masteryColor(v: number) {
  if (v >= 75) return "hsl(var(--success))";
  if (v >= 55) return "hsl(var(--primary))";
  return "hsl(var(--warning))";
}
