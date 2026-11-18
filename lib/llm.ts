// Provider-agnostic LLM client: OpenAI GPT as primary, Gemini as automatic backup (or vice versa).
type Role = "system" | "user" | "assistant";
export type LlmMsg = { role: Role; content: string };
export type Provider = "openai" | "gemini";

/** Env values with stray spaces or quotes removed (a common copy-paste slip). */
const key = (name: string) => (process.env[name] || "").trim().replace(/^["']|["']$/g, "");

export function providers(): Provider[] {
  const have: Provider[] = [];
  if (key("OPENAI_API_KEY")) have.push("openai");
  if (key("GEMINI_API_KEY")) have.push("gemini");
  const pref = key("LLM_PROVIDER") as Provider | "";
  if (pref && have.includes(pref)) return [pref, ...have.filter((p) => p !== pref)];
  return have;
}

async function openai(messages: LlmMsg[], json: boolean): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key("OPENAI_API_KEY")}` },
    body: JSON.stringify({
      model: modelOf("openai"),
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `OpenAI ${r.status}`);
  return j.choices?.[0]?.message?.content ?? "";
}

async function gemini(messages: LlmMsg[], json: boolean): Promise<string> {
  const model = modelOf("gemini");
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key("GEMINI_API_KEY") },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: json ? { responseMimeType: "application/json" } : {},
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Gemini ${r.status}`);
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

/** Tries each configured provider in order; returns the text and which provider answered. */
export const modelOf = (p: Provider) => (p === "openai" ? process.env.OPENAI_MODEL || "gpt-4.1-mini" : process.env.GEMINI_MODEL || "gemini-2.5-flash");

export async function complete(messages: LlmMsg[], json = false): Promise<{ text: string; provider: Provider; model: string }> {
  const list = providers();
  if (!list.length) throw new Error("No AI provider configured");
  let lastErr: unknown;
  for (const p of list) {
    try {
      const text = await (p === "openai" ? openai(messages, json) : gemini(messages, json));
      if (text.trim()) return { text, provider: p, model: modelOf(p) };
      throw new Error(`${p} returned an empty answer`);
    } catch (e) {
      lastErr = e;
      console.error(`[llm] ${p} failed:`, (e as Error).message);
    }
  }
  throw lastErr;
}

export function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  return JSON.parse(cleaned) as T;
}
