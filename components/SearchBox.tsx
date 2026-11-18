"use client";
// City / area / PIN-code search with live suggestions (accessible combobox: ↑ ↓ Enter Esc).
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestion } from "@/lib/places";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: Suggestion) => void;
  placeholder: string;
  noResults: string;
  inputClassName?: string;
  /** Google Places session token and an optional point to bias results towards. */
  context?: { session: string; near?: { lat: number; lon: number } };
};

export function SearchBox({ value, onChange, onPick, placeholder, noResults, inputClassName = "", context }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const typed = useRef(false); // only suggest after the user types, not after a pick
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 2) return; // too short: the list is simply hidden (see `showList`)
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const extra = `${context?.session ? `&session=${context.session}` : ""}${context?.near ? `&lat=${context.near.lat.toFixed(2)}&lon=${context.near.lon.toFixed(2)}` : ""}`;
      fetch(`/api/places?q=${encodeURIComponent(q)}${extra}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => {
          setItems(j.suggestions ?? []);
          setSearched(true);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // Search only when the typed text changes, not when the bias location or session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close when clicking elsewhere.
  useEffect(() => {
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const showList = open && value.trim().length >= 2;

  const pick = (s: Suggestion) => {
    typed.current = false;
    setOpen(false);
    setItems([]);
    onPick(s);
  };

  return (
    <div ref={wrap} className="relative min-w-0 flex-1 basis-full sm:basis-auto">
      <input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={placeholder}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!showList || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`w-full bg-transparent outline-none focus-visible:outline-none ${inputClassName}`}
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 max-h-80 overflow-auto rounded-2xl bg-card p-1.5 shadow-lg ring-1 ring-line">
          {items.length === 0 && searched && <li className="px-3 py-2.5 text-sm text-muted">{noResults}</li>}
          {items.map((s, i) => (
            <li
              key={`${s.label}-${s.sub}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left ${i === active ? "bg-bg" : ""}`}
            >
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg text-xs text-muted">
                {s.kind === "pin" ? "PIN" : s.kind === "spot" ? "📍" : "◎"}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.label}</span>
                <span className="block truncate text-xs text-muted">{s.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
