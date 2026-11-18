import { NextRequest, NextResponse } from "next/server";
import { complete, providers, type LlmMsg } from "@/lib/llm";
import { SYSTEM, contextText, langRule } from "@/lib/prompt";
import { cleanLang, cleanProfile, rateLimited, validAir } from "@/lib/guard";
import type { ChatMsg } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !validAir(body.air) || !Array.isArray(body.messages))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const lang = cleanLang(body.lang);

  if (!providers().length)
    return NextResponse.json({ reply: lang === "hi" ? "AI सहायक अभी सेट नहीं है (सर्वर पर API key नहीं है)।" : "The AI assistant isn't set up yet (no API key on the server)." });
  if (rateLimited(req, 30))
    return NextResponse.json({ reply: lang === "hi" ? "बहुत सारे सवाल — कुछ मिनट बाद पूछें।" : "Too many questions — try again in a few minutes." });

  const history: LlmMsg[] = (body.messages as ChatMsg[])
    .slice(-12)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  try {
    const { text, provider } = await complete([
      {
        role: "system",
        content: `${SYSTEM}\n\n${langRule(lang)}\nAnswer follow-up questions in under 120 words, specific to the data below. Use short bullet points when listing steps.\n\nLIVE DATA:\n${contextText(body.air, cleanProfile(body.profile))}`,
      },
      ...history,
    ]);
    return NextResponse.json({ reply: text, source: provider });
  } catch (e) {
    return NextResponse.json({ reply: (lang === "hi" ? "माफ़ कीजिए, AI अभी उपलब्ध नहीं है: " : "Sorry, the AI is unavailable right now: ") + (e as Error).message });
  }
}
