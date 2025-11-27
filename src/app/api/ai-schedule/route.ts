import { NextResponse } from "next/server";
import OpenAI from "openai";
import util from "util";

function buildSystemPrompt(todayLabel: string, anchorDate: string) {
  return `
You are a proactive scheduling assistant. Today is ${todayLabel}. Use ${anchorDate} as the reference date for “today” unless the user explicitly states another baseline. The very first scheduled line must match the earliest requested day (default: ${anchorDate}) exactly.

Create a chronological schedule that can span multiple weeks—or move backward if the user mentions prep periods like “a week before” or “the day before.” Use this exact line-based format and continue repeating the day headings (Sun, Mon, Tue, Wed, Thu, Fri, Sat) in order as many times as needed. Every line MUST show the real ISO date for that day immediately after the day label:

'Sun (YYYY-MM-DD)/Task name :: short description (HH:MM-HH:MM)/Next task :: short description (HH:MM-HH:MM)/.../Last task :: short description (HH:MM-HH:MM)
Mon (YYYY-MM-DD)/Task name :: short description (HH:MM-HH:MM)/...'

Rules:
1. Always include start and end times in 24-hour HH:MM-HH:MM format for every slot.
2. Separate each slot’s task name and its one-sentence description with “ :: ” (two colons with spaces).
3. If a day has no slots, keep the day header with its date and leave it blank after the slash.
4. The ISO date must track real calendar days in chronological order and may never skip backwards. To plan “week before” or “day before,” subtract 7 or 1 day from ${anchorDate} (or the relevant day) and keep going sequentially.
5. Explicitly verify each line’s ISO date matches the intended weekday (Mon label must show a date that really is a Monday, etc.).
6. Unless the user explicitly asks for a single block, spread the work across the entire day (morning/afternoon/evening) so a “review day” or intensive period has multiple sessions with breaks.
7. Each task name must be meaningful (e.g., “Chemistry mock exam review”, “Deep work sprint for launch copy”) and may never be a generic placeholder like “Slot1” or “Task A”.
8. Use only plain text—no explanations, quotes, markdown, or extra whitespace.
9. Keep the output strictly to the specified format, one line per day label.
`;
}


function collectStrings(v: any, out: string[] = []) {
  if (v == null) return out;
  if (typeof v === "string") {
    if (v.trim()) out.push(v.trim());
    return out;
  }
  if (typeof v === "number" || typeof v === "boolean") {
    out.push(String(v));
    return out;
  }
  if (Array.isArray(v)) {
    for (const it of v) collectStrings(it, out);
    return out;
  }
  if (typeof v === "object") {
    // common keys that may hold text
    if (typeof v.text === "string" && v.text.trim()) out.push(v.text.trim());
    if (typeof v.content === "string" && v.content.trim()) out.push(v.content.trim());
    if (typeof v.output_text === "string" && v.output_text.trim()) out.push(v.output_text.trim());
    // try nested keys/fields
    for (const key of Object.keys(v)) {
      if (["text","content","output_text"].includes(key)) continue;
      collectStrings(v[key], out);
    }
    return out;
  }
  return out;
}

function extractTextFromSdkResponse(resp: any) {
  // try choices -> message -> content etc
  try {
    if (!resp) return "";
    const texts: string[] = [];

    if (Array.isArray(resp.choices) && resp.choices.length) {
      for (const choice of resp.choices) {
        // choice.text (OpenAI legacy)
        if (typeof choice.text === "string" && choice.text.trim()) texts.push(choice.text.trim());

        // choice.message
        if (choice.message) {
          // message.content may be string/array/object
          collectStrings(choice.message.content, texts);
          // if message itself has fields
          collectStrings(choice.message, texts);
        }

        // other potential fields on choice
        collectStrings(choice, texts);
      }
    }

    // NVIDIA shapes: outputs -> content
    if (Array.isArray(resp.outputs)) {
      for (const out of resp.outputs) {
        collectStrings(out.content, texts);
        collectStrings(out, texts);
      }
    }

    // fallback generic search
    collectStrings(resp, texts);

    // join unique non-empty pieces preserving order
    const joined = texts.map(s => s.trim()).filter(Boolean);
    if (!joined.length) return "";
    // remove duplicates while preserving order
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of joined) {
      if (!seen.has(t)) {
        unique.push(t);
        seen.add(t);
      }
    }
    return unique.join("\n").trim();
  } catch (e) {
    console.debug("[ai-schedule] extractTextFromSdkResponse error:", String(e));
    return "";
  }
}

export async function POST(req: Request) {
  console.debug("[ai-schedule] incoming request");
  const bodyRaw = await req.text().catch(() => "");
  console.debug("[ai-schedule] raw body:", bodyRaw);
  const body = (() => {
    try {
      return bodyRaw ? JSON.parse(bodyRaw) : null;
    } catch {
      return { raw: bodyRaw };
    }
  })();
  console.debug("[ai-schedule] parsed body:", util.inspect(body, { depth: 2 }));

  const todayLabel = new Date().toISOString().slice(0, 10);
  const userPrompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!userPrompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  const requestedAnchorRaw = typeof body?.anchorDate === "string" ? body.anchorDate.trim() : "";
  const anchorDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedAnchorRaw) ? requestedAnchorRaw : todayLabel;
  const extraInstructions = `\n\nCurrent calendar date: ${todayLabel}. Expand and distribute the plan across every timeframe the user mentions (e.g., “week before”, “day before”, “starting today”) while keeping ISO dates accurate and sequential. The first day should default to ${anchorDate} unless the user demands a different baseline, and any mentions of “week/day before/after” must shift the dates accordingly. Each active day should have multiple sessions (morning, afternoon, evening) unless the user insists otherwise. For each slot, provide a short descriptive phrase using “ :: ” before the (HH:MM-HH:MM) timing and use a meaningful task title derived from the user’s prompt (never placeholders like “Slot1”). DO NOT USE QUOTATIONS PLEASE, do not repeat \\n's and follow the exact format mentioned.`;
  const prompt = userPrompt + extraInstructions;

  const apiKey = process.env.NVIDIA_API_KEY || "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";
  if (!apiKey) {
    console.error("[ai-schedule] missing NVIDIA_API_KEY");
    return NextResponse.json(
      { error: "server missing NVIDIA_API_KEY", hint: "set NVIDIA_API_KEY in .env.local and restart" },
      { status: 500 }
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1",
  });

  try {
    const resp = await client.chat.completions.create({
      model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      messages: [
        { role: "system", content: buildSystemPrompt(todayLabel, anchorDate) },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      top_p: 0.95,
      max_tokens: 800,
      stream: false,
    });

    // debug: inspect the full SDK object
    console.debug("[ai-schedule] raw SDK resp:", util.inspect(resp, { depth: 4 }));

    const extracted = extractTextFromSdkResponse(resp);
    console.debug("[ai-schedule] extracted text:", util.inspect(extracted, { depth: 2 }));

    if (!extracted) {
      console.error("AI returned empty response (SDK):", util.inspect(resp, { depth: 2 }));
      return NextResponse.json({ error: "AI returned empty response", raw: resp }, { status: 502 });
    }

    return NextResponse.json({ text: extracted, provider: "nvidia" });
  } catch (err: any) {
    console.error("ai-schedule nvidia sdk error:", err);
    return NextResponse.json({ error: err?.message || "AI error", details: String(err) }, { status: 500 });
  }
}
