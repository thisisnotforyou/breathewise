export function Card({ title, hint, children, className = "" }: { title?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] bg-card p-6 ring-1 ring-line ${className}`}>
      {title && <h2 className="font-display text-2xl">{title}</h2>}
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
