// BreatheWise logo mark and wordmark. Colours follow the theme (sage on light, mint on dark).
import { BRAND } from "@/lib/brand";

export function LogoMark({ className = "h-8 w-8", shape = "circle" }: { className?: string; shape?: "circle" | "square" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {shape === "circle" ? <circle cx="24" cy="24" r="24" fill="var(--accent)" /> : <rect width="48" height="48" rx="13" fill="var(--accent)" />}
      <path d={BRAND.stem} stroke="var(--on-accent)" strokeWidth="2.8" strokeLinecap="round" />
      <g fill="var(--on-accent)">
        <path d={BRAND.leftLeaf} />
        <path d={BRAND.rightLeaf} />
      </g>
      <g fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
        <path d={BRAND.leftVein} />
        <path d={BRAND.rightVein} />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-2xl leading-none sm:text-3xl">
        Breathe<span className="text-accent">Wise</span>
      </span>
    </span>
  );
}
