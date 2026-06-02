import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = ["https://solenq.app", "https://www.solenq.app", "http://localhost:5173", "https://solenq.netlify.app"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "relationship" | "paid";
type Variant = "default" | "softer" | "stronger";
type Kind = "message" | "dna";

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const reqCorsHeaders = {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigin,
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: reqCorsHeaders });

  try {
    const body = await req.json();
    const kind: Kind = body.kind === "dna" ? "dna" : "message";
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    // ---------- DNA path ----------
    if (kind === "dna") {
      const writingSample: string = body.writingSample || body.sample || "";
      if (!writingSample.trim()) {
        return jsonError("Paste a sample of your writing first.", 400);
      }

      const dnaSystem = `You are a no-BS communication coach analyzing a freelancer's REAL client messages. Be specific, slightly blunt, never generic. Quote phrases from the sample.

OUTPUT REQUIREMENTS:
- style_breakdown: 1-2 line behavioral read on HOW they communicate (not what they wrote). Quote a specific phrase.
- style_strengths: 2-3 concrete strengths. Reference exact phrases or patterns from the sample.
- style_weaknesses: 2-3 honest weaknesses. Be direct. Examples: "You over-apologize — 'sorry to bother' weakens your authority", "You hedge with 'just' three times".
- style_improvements: EXACTLY 3 actionable rules. Imperative voice. Example: "Cut every 'just' and 'sorry'", "Replace 'when you get a chance' with a specific date".
- upgraded_slightly: ONE-LINE rewrite of the strongest message in their sample — slightly tighter, same tone.
- upgraded_stronger: ONE-LINE rewrite — direct, time-bound, no softeners.
- behavior_insight: 1-2 lines on what the CLIENT likely thinks/feels reading their messages. Be honest. e.g. "Clients read this as 'no urgency, can be delayed'. They'll deprioritize you."
- score: number 1-10 (be honest, most freelancers are 5-7)
- tone_type: 2-4 words like "Apologetic & Soft", "Warm but Vague", "Direct & Confident"
- risk_level: one of "Low", "Medium", "High" — risk that this style gets them ignored or underpaid

If the sample is too short or generic to analyze meaningfully, still produce specific output by inferring patterns. Never write generic advice like "be more confident" — always tie it to their words.`;

      const dnaTools = [{
        type: "function",
        function: {
          name: "analyze_dna",
          description: "Return communication DNA analysis",
          parameters: {
            type: "object",
            properties: {
              style_breakdown: { type: "string" },
              style_strengths: { type: "string" },
              style_weaknesses: { type: "string" },
              style_improvements: { type: "string" },
              upgraded_slightly: { type: "string" },
              upgraded_stronger: { type: "string" },
              behavior_insight: { type: "string" },
              score: { type: "number" },
              tone_type: { type: "string" },
              risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
            },
            required: [
              "style_breakdown","style_strengths","style_weaknesses","style_improvements",
              "upgraded_slightly","upgraded_stronger","behavior_insight","score","tone_type","risk_level"
            ],
            additionalProperties: false,
          },
        },
      }];

      const dnaResp = await callAI(GROQ_API_KEY, dnaSystem, `Sample messages:\n${writingSample}`, dnaTools, "analyze_dna");
      if (dnaResp instanceof Response) return dnaResp;
      const merged = {
        ...dnaResp,
        upgraded_style: dnaResp.upgraded_stronger || dnaResp.upgraded_slightly || "",
      };
      return new Response(JSON.stringify(merged), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- Simulate path ----------
    if (body.variant === "simulate") {
      const situation: string = body.situation ?? "";
      const message: string = body.message ?? "";
      const simPrompt = `Given this situation: "${situation}" and this message: "${message}"

Predict exactly 3 realistic reactions. Return ONLY a JSON object, no markdown, no explanation:
{"reactions":[{"label":"They agree","emoji":"✅","probability":"Most likely","theirResponse":"One sentence of what they might say","yourNextMove":"One sentence of what to do next"},{"label":"They push back","emoji":"⚡","probability":"Possible","theirResponse":"One sentence pushback","yourNextMove":"One sentence on how to respond calmly"},{"label":"They go silent","emoji":"🔇","probability":"Less likely","theirResponse":"No response or brief dismissal","yourNextMove":"What to do if they go quiet"}]}`;

      const simResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: simPrompt }],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      if (!simResp.ok) return jsonError("Simulation failed", 500);
      const simData = await simResp.json();
      const rawText = simData.choices?.[0]?.message?.content ?? "";
      const clean = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Map path ----------
    if (body.mode === "map") {
      const q1: string = body.q1 || "";
      const q2: string = body.q2 || "";
      const q3: string = body.q3 || "";
      const context: string = body.context || "";
      const mapPrompt = `You are a calm communication coach. Answer based on:
Conversation type: ${q1}
Biggest fear: ${q2}
Definition of a win: ${q3}
Extra context: ${context || "none"}

Return ONLY a JSON object, no markdown:
{"opening":"One human sentence on how to open this conversation","coreMessage":"The exact thing to say — one direct sentence","branches":[{"tag":"If they respond well","action":"What to say next"},{"tag":"If they push back","action":"How to handle it calmly"},{"tag":"If they shut down","action":"How to exit without burning the relationship"}],"doNotSay":"One specific thing to avoid and why","reminder":"One warm grounding sentence to calm them before they start"}`;

      const mapResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: mapPrompt }],
          temperature: 0.7,
          max_tokens: 700,
        }),
      });
      if (!mapResp.ok) return jsonError("Map generation failed", 500);
      const mapData = await mapResp.json();
      const rawText = mapData.choices?.[0]?.message?.content ?? "";
      const clean = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Message path ----------
    const situation: string = body.situation;
    const mode: Mode = body.mode === "paid" ? "paid" : "relationship";
    const variant: Variant = ["softer", "stronger"].includes(body.variant) ? body.variant : "default";
    const previousMessage: string | undefined = body.previousMessage;
    const requestedLevel: number | undefined =
      typeof body.level === "number" && body.level >= 1 && body.level <= 5 ? Math.round(body.level) : undefined;
    const ALLOWED_TONES = ["Gentle", "Balanced", "Firm", "Assertive"] as const;
    const tone: typeof ALLOWED_TONES[number] =
      ALLOWED_TONES.includes(body.tone) ? body.tone : "Balanced";

    if (!situation || typeof situation !== "string" || situation.trim().length === 0) {
      return jsonError("Please describe your situation.", 400);
    }

    const ladderBlock = `## 5-LEVEL ESCALATION LADDER (MANDATORY)
LEVEL 1 — Soft Check-in: just touching base, zero pressure.
LEVEL 2 — Guided Nudge: link progress to payment, gentle direction.
LEVEL 3 — Clear Direction: explicit expectation with a soft date.
LEVEL 4 — Firm Boundary: payment required before next action.
LEVEL 5 — Hard Stop: pause work / clear consequence.

MODE CLAMP:
- Stay Polite mode → ONLY levels 1, 2, or 3.
- Get Paid Fast mode → ONLY levels 3, 4, or 5.

AUTO-SELECT level from situation signals:
- Delay < 2 days, first nudge → L1 (polite) or L3 (fast)
- 3–5 days, no reply → L2 (polite) or L3 (fast)
- 5+ days, repeated "soon" / ignored → L3 (polite) or L4 (fast)
- Multiple ignored follow-ups, weeks late → L3 (polite — final warm ask) or L5 (fast)
- Scope creep → L3 (polite) or L4 (fast)
${requestedLevel ? `\nUSER OVERRIDE: Use LEVEL ${requestedLevel} (still respect mode clamp).` : ""}`;

    const modeBlock = mode === "paid"
      ? `MODE: GET PAID FAST — DECISIVE, TIME-BOUND, CONTROLLED
Voice: direct, calm, confident. You set the terms.

LEVEL → SHAPE:
- L3: [FACT] + [REQUIREMENT with date] + [ACTION ASK]
- L4: [FACT] + [REQUIREMENT] + [CONSEQUENCE before next deliverable] + [ACTION ASK]
- L5: [FACT] + [HARD STOP — pausing work] + [CLEAR CONDITION TO RESUME]

NEVER use:
- "just checking in", "just wanted to", "no worries", "whenever", "no rush", "hopefully", "maybe", "if possible"
- Apologies, hedges, softeners.

Feel: a professional who respects their time. NO emoji. NO greeting fluff.
Example L4: "Hey — invoice #142 is 7 days past due. I'll need it cleared by Friday before phase 2 ships. Confirm today?"
Example L5: "The invoice is 14 days overdue. I'm pausing work until it clears. Send today and I'll have phase 2 live tomorrow."`
      : `MODE: STAY POLITE — WARM, RELATIONSHIP-FIRST, GENTLY GUIDING
Voice: friendly, calm, human. Preserve the relationship while still moving things forward.

LEVEL → SHAPE:
- L1: [WARM OPENING] + [LIGHT CHECK-IN] + [NO-PRESSURE ASK]
- L2: [WARM OPENING] + [CONNECT PROGRESS TO PAYMENT] + [SOFT ACTION ASK]
- L3: [WARM OPENING] + [SPECIFIC SOFT EXPECTATION with rough date] + [CLEAR ASK]

NEVER use:
- Hard deadlines, ultimatums, "I need", "you must", "pause work", "or else"
- Pure passivity ("no rush at all whenever") with no ask — there must always be a request.

Feel: texting a client you genuinely want to keep working with. Zero pressure, but still moving the ball.
Example L2: "Hey! Quick one — once the last invoice clears I can kick off the next batch. Any update on your end?"`;

    const variantBlock = variant === "softer"
      ? `VARIANT: SOFTER — Same level. Keep the same escalation level but rewrite warmer/gentler. Same point, less edge.`
      : variant === "stronger"
      ? `VARIANT: STRONGER — Same level. Keep the same escalation level but tighten and sharpen. Same point, more edge.`
      : `VARIANT: DEFAULT — Fresh write based on situation, mode, and auto-selected level.`;

    const toneBlock = {
      Gentle: `TONE DIAL: GENTLE — Maximum warmth. Soft openers, zero edge, friendly cadence. Still includes the ask, but framed as a kind request. Never demanding.`,
      Balanced: `TONE DIAL: BALANCED — Neutral professional. Clear and human. Neither soft nor sharp.`,
      Firm: `TONE DIAL: FIRM — Direct, no softeners, no apologies. Confident verbs. Specific dates. Respectful but unmistakably serious.`,
      Assertive: `TONE DIAL: ASSERTIVE — Maximum directness within mode rules. State facts, state requirement, state next step. Short sentences. No hedging words at all.`,
    }[tone];

    const systemPrompt = `You are a calm, sharp communication advisor. Think of yourself as a trusted friend who has deep knowledge of psychology, negotiation, and human dynamics — but talks like a real person, not a consultant.

Your one job: write a single message that sounds like a real human wrote it.

Rules that cannot be broken:
1. Sound human. Natural sentence rhythm. Mix short sentences with longer ones. Never stiff or corporate.
2. Be specific to THIS situation. Never use generic openers like "I hope this finds you well", "I wanted to reach out", "touch base", "circle back", "as per my previous", "going forward", "utilize", "leverage", "at the end of the day".
3. No over-apologizing. No over-explaining. Say the thing clearly and stop.
4. Match the emotional weight of the situation. If it's tense, write something grounded. If it's casual, write something warm.
5. The message should feel like it came from the user — not from an AI, not from a template.
6. Never write [Your name] or any placeholders. End the message naturally.
7. For paid/money situations: be professional but human. Not aggressive, not desperate.
8. For relationship situations: preserve the dignity of both people.

For why_it_works: write 2 sentences maximum. Be specific to THIS message and THIS situation. Not generic advice.
For expected_outcome: be honest. If it might be difficult, say so. Think about the actual human reading the message.
For advice: one practical next step. Specific. Not "follow up if needed."
For follow_up_plan: write natural human actions. Not corporate escalation steps.
For whatsapp_message: shorter, more casual, natural for chat. Max 3 sentences.
For email_body: proper email format but still warm and human.`;

    const mood: string | undefined = body.mood;
    const goal: string | undefined = body.goal;
    const contactContext: string | undefined = body.contactContext;

    const contextLines: string[] = [];
    if (mood) contextLines.push(`User's current state: ${mood}`);
    if (goal) contextLines.push(`User's goal for this interaction: ${goal}`);
    if (contactContext) contextLines.push(`Known context about this person: ${contactContext}`);
    const additionalContext = contextLines.length > 0 ? `\n\nAdditional context:\n${contextLines.join("\n")}` : "";

    const userContent = variant !== "default" && previousMessage
      ? `Situation: ${situation}${additionalContext}\n\nPrevious message: "${previousMessage}"\n\nRewrite ${variant} at the SAME level.`
      : `Situation: ${situation}${additionalContext}`;

    const tools = [{
      type: "function",
      function: {
        name: "generate_message",
        description: "Generate one message plus brief analysis, advice, why-it-works, level, confidence, client type, expected outcome, 3-step follow-up plan, and channel variants for WhatsApp + Email.",
        parameters: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            advice: { type: "string" },
            message: { type: "string" },
            why_it_works: { type: "string" },
            level: { type: "number" },
            confidence: { type: "string", enum: ["High", "Medium"] },
            confidence_score: { type: "number" },
            client_type: {
              type: "string",
              enum: ["Avoider", "Busy but honest", "Scope creeper", "Low priority payer", "Ghoster"],
            },
            client_insight: { type: "string" },
            expected_outcome: { type: "string" },
            follow_up_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  action: { type: "string" },
                },
                required: ["day", "action"],
                additionalProperties: false,
              },
            },
            whatsapp_message: { type: "string", description: "Same message reshaped for WhatsApp — short lines, conversational" },
            email_subject_lines: {
              type: "array",
              description: "EXACTLY 3 subject lines, ranked best to worst",
              items: { type: "string" },
            },
            email_body: { type: "string", description: "Clean short email body with opening, body, closing. End with 'Thanks,'" },
          },
          required: [
            "analysis", "advice", "message", "why_it_works", "level",
            "confidence", "confidence_score", "client_type", "client_insight",
            "expected_outcome", "follow_up_plan",
            "whatsapp_message", "email_subject_lines", "email_body",
          ],
          additionalProperties: false,
        },
      },
    }];

    const result = await callAI(GROQ_API_KEY, systemPrompt, userContent, tools, "generate_message");
    if (result instanceof Response) return result;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-response error:", e);
    return jsonError(e instanceof Error ? e.message : "Something went wrong. Please try again.", 500);
  }
});

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  tools: any,
  toolName: string,
): Promise<any | Response> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return jsonError("Too many requests. Try again in a moment.", 429);
    if (response.status === 402) return jsonError("AI credits exhausted. Try again later.", 402);
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    return jsonError("Something went wrong. Please try again.", 500);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  return jsonError("No valid response from AI", 500);
}
