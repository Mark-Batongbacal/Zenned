import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const prompt = body?.prompt;
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  // use either NVIDIA key or OPENAI key from env (do NOT hardcode keys)
  const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "server missing API key (set NVIDIA_API_KEY or OPENAI_API_KEY)" }, { status: 500 });

  // base URL for NVIDIA Integrate (can be overridden via env)
  const baseURL = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1";
  const endpoint = `${baseURL.replace(/\/$/, "")}/chat/completions`;

  // strict system prompt: model must output exactly the 7-line template
  const systemPrompt =
    "Output a 7-line weekly schedule using this exact template and nothing else (plain text, no bullets):\n" +
    "Sun/Task (Details) 1:00pm-2:00pm/Rest 2:00-2:30/Task (Details) 2:30-3:30\n" +
    "Mon/ / /\nTue/ / /\nWed/ / /\nThu/ / /\nFri/ / /\nSat/ / /\n" +
    "Only use that format. Do not add explanation.";

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 800,
        top_p: 0.95,
      }),
    });

    const raw = await resp.text();

    if (!resp.ok) {
      // surface remote body to server log for debugging, return helpful client error
      console.error("AI provider non-OK response:", resp.status, raw);
      return NextResponse.json({ error: "AI provider returned error", details: raw }, { status: 502 });
    }

    // Try parse JSON, fallback to raw text
    let text = "";
    try {
      const json = JSON.parse(raw);
      // OpenAI-compatible shape: choices[0].message.content
      text = (json?.choices?.[0]?.message?.content) || (json?.choices?.[0]?.text) || "";
      if (!text && typeof json === "string") text = json;
    } catch (e) {
      // not JSON — use raw text
      text = raw;
    }

    // final sanity: ensure we return something
    if (!text) {
      console.error("AI provider returned empty response body");
      return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("ai-schedule error:", err);
    return NextResponse.json({ error: err?.message || "AI error" }, { status: 500 });
  }
}