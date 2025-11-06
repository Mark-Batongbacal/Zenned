import { NextResponse } from "next/server";
import OpenAI from "openai";
import util from "util";

const systemPrompt = `
I have the following tasks with deadlines or priorities:

{{task_list}}

Today is {{today}}.

Create a **7-day weekly schedule** strictly in this format:

'Sun/Slot1 (HH:MM-HH:MM)/Slot2 (HH:MM-HH:MM)/.../SlotN (HH:MM-HH:MM)\\n' +
'Mon/Slot1 (HH:MM-HH:MM)/Slot2 (HH:MM-HH:MM)/.../SlotN (HH:MM-HH:MM)\\n' +
'Tue/Slot1 (HH:MM-HH:MM)/Slot2 (HH:MM-HH:MM)/.../SlotN (HH:MM-HH:MM)\\n' +
... etc for Wed, Thu, Fri, Sat

Rules:
1. Include a **start and end time for every slot**, in 24-hour format HH:MM-HH:MM.
2. Empty slots can be a single space or skipped (keep '/' separators).
3. Include creative scheduling: breaks, Pomodoro sessions, focus bursts, etc.
4. Adapt to my style: I am a {{user_type}} (e.g., "night owl", "morning person").
5. Prioritize tasks by urgency, deadlines, and complexity.
6. Output **only the schedule string**, plain text, no explanations.
7. Strictly follow the format: day first, then slots, with '/' separators, ending each day with '\\n'.
8. DO NOT USE DAYS NOT MENTIONED.
9. DO NOT REPEAT '\\n' or quotes.
`;


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

  const prompt = body?.prompt + "DO NOT USE QUOTATIONS PLEASE, do not repeat \\n's and follow the exact format mentioned.";
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

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
        { role: "system", content: systemPrompt },
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