"use client";
import { useEffect, useRef, useState } from "react";
import { dict } from "@/lib/i18n";
import type { AirData, ChatMsg, Lang, Profile } from "@/lib/types";
import { Card } from "./Card";

export function Chat({ air, profile, lang }: { air: AirData; profile: Profile; lang: Lang }) {
  const t = dict[lang];
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // A new place starts a fresh conversation: parents give <Chat> a key per location.
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send(q: string) {
    q = q.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ air, profile, lang, messages: next }) });
      const j = await r.json();
      setMsgs([...next, { role: "assistant", content: j.reply || j.error || "…" }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Network error." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`💬 ${t.chat}`}>
      <div ref={box} className="max-h-96 space-y-2 overflow-y-auto">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {t.suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-sm hover:border-accent">
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto max-w-[85%] bg-accent text-on-accent" : "mr-auto max-w-[90%] border border-line"}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="mr-auto rounded-xl border border-line px-3 py-2 text-sm text-muted">…</div>}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chatPh} maxLength={500} className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2" />
        <button disabled={busy} className="rounded-xl bg-accent px-4 py-2 font-semibold text-on-accent disabled:opacity-50">
          {t.send}
        </button>
      </form>
    </Card>
  );
}
