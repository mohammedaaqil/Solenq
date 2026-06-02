// NOTE: This file is kept as a fallback only. Primary calls go through Supabase Edge Functions.
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

function extractJSON(raw: string): string {
  const stripped = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const objStart = stripped.indexOf("{");
  const objEnd = stripped.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    return stripped.slice(objStart, objEnd + 1);
  }
  return stripped;
}

export async function groqJSON<T>(prompt: string): Promise<T> {
  if (!GROQ_API_KEY) {
    console.error("[groq] VITE_GROQ_API_KEY is missing or undefined");
    throw new Error("Missing Groq API key");
  }

  const call = async (model: string): Promise<T> => {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[groq] HTTP error", res.status, txt.slice(0, 200));
      throw new Error(`Groq ${res.status}: ${txt}`);
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const clean = extractJSON(raw);
    return JSON.parse(clean) as T;
  };

  try {
    return await call(MODEL);
  } catch (e) {
    console.warn("[groq] primary model failed, trying fallback:", e);
    return await call(FALLBACK_MODEL);
  }
}
