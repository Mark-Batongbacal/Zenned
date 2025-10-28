import { NextResponse } from "next/server";
import OpenAI from "openai";
import util from "util";

const systemPrompt =
  `
I have the following tasks with deadlines or priorities:

{{task_list}}

Today is {{today}}.

Create a **7-day weekly schedule** strictly in this format:

'Sun/Slot1/Slot2/.../SlotN\\n' +
'Mon/Slot1/Slot2/.../SlotN\\n' +
'Tue/Slot1/Slot2/.../SlotN\\n' +
'Wed/Slot1/Slot2/.../SlotN\\n' +
'Thu/Slot1/Slot2/.../SlotN\\n' +
'Fri/Slot1/Slot2/.../SlotN\\n' +
'Sat/Slot1/Slot2/.../SlotN\\n'

Example:
'Sun/Review (30 minutes)/Pomodoro Break (5 minutes)/Review (30 minutes)/ Pomodoro Break (5 minutes)' +
'Mon/ / / / \\n'

Rules:

1. **Strictly preserve the format**: day, then slots separated by '/', each day ends with '\\n'. Do not change the template.
2. Each day can have **any number of slots** (0, 1, 2, 5, etc.). Empty slots can be a single space or skipped (just keep '/' separators).
3. Include creative scheduling: breaks, Pomodoro sessions, focus bursts, etc.
4. Adapt to my style: I am a {{user_type}} (e.g., "night owl", "morning person", "locked-in focused").
5. Prioritize tasks by urgency, deadlines, and complexity.
6. Output **only the schedule string**, plain text, no explanations or bullet points.
7. Do not include the reasoning. Only give the schedule output.
8. Make sure that it is in this format exactly, no deviations
9. Make sure that the output follows the exact punctuations such as /, ' and + as shown in the format above.
10. **MAKE SURE TO FOLLOW THE FORMAT**
11. **DO NOT USE DAYS OF THE WEEK THAT ARE NOT MENTIONED**
12. Take note of the abbreviations of the days of the week (mon, tues, wed, thurs, fri, sun, sat)

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