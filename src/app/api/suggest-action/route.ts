import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type ActionType = "user_story" | "declined" | "referred" | "unclear" | "done";

const ACTIONS: ActionType[] = [
  "user_story",
  "declined",
  "referred",
  "unclear",
  "done",
];

interface Example {
  title?: string;
  details?: string;
  action?: string;
}

interface SuggestRequestBody {
  title?: string;
  details?: string;
  source?: string;
  urgency?: string;
  tags?: string[];
  examples?: Example[];
}

interface SuggestResult {
  action: ActionType;
  confidence: number;
  rationale: string;
  learnedFrom: number;
}

const ACTION_GUIDE = `Action options and when each applies:
- "user_story": a clear, in-scope product change worth building — turn it into a backlog item.
- "referred": belongs to another team or owner, not this product.
- "unclear": too vague or missing information; needs clarification before a decision.
- "declined": out of scope, not worth doing, or against strategy/policy.
- "done": already resolved, a duplicate, or no action required.`;

const SYSTEM_PROMPT = `You are a triage copilot for a product owner refining stakeholder requests.
Given one request, decide the single most likely refinement action and explain why in one short sentence.
${ACTION_GUIDE}
If past decisions by this product owner are provided, weight them heavily — match their personal triage style and vocabulary.
Respond ONLY with JSON matching this exact shape: {"action": string, "confidence": number, "rationale": string}.
- action: exactly one of "user_story", "declined", "referred", "unclear", "done".
- confidence: an integer 0-100 reflecting how sure you are.
- rationale: one concise sentence (max ~20 words), no preamble, addressed to the product owner.`;

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 60;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI isn't configured yet. Add an OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: SuggestRequestBody;
  try {
    body = (await req.json()) as SuggestRequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return Response.json(
      { error: "A request title is required." },
      { status: 400 },
    );
  }
  const details = (body.details ?? "").trim();
  const source = (body.source ?? "").trim();
  const urgency = (body.urgency ?? "").trim();
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];

  const examples = (Array.isArray(body.examples) ? body.examples : [])
    .filter((e) => e && (e.title || e.details) && e.action)
    .filter((e) => ACTIONS.includes(e.action as ActionType))
    .slice(0, 12);

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (examples.length > 0) {
    const history = examples
      .map((e, i) => {
        const text = [e.title, e.details].filter(Boolean).join(" — ");
        return `${i + 1}. "${text}" → ${e.action}`;
      })
      .join("\n");
    messages.push({
      role: "user",
      content: `Here are this product owner's past triage decisions, as a guide to their style:\n${history}`,
    });
  }

  const userContent = [
    `Triage this request.`,
    `Title: ${title}`,
    details ? `Details: ${details}` : "",
    source ? `Source/stakeholder: ${source}` : "",
    urgency ? `Urgency: ${urgency}` : "",
    tags.length ? `Tags: ${tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  messages.push({ role: "user", content: userContent });

  let aiRes: Response;
  try {
    aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });
  } catch {
    return Response.json(
      { error: "Couldn't reach the AI service." },
      { status: 502 },
    );
  }

  if (!aiRes.ok) {
    const detail = await aiRes.text().catch(() => "");
    return Response.json(
      { error: "The AI request failed.", detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  const data = (await aiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";

  let parsed: Partial<SuggestResult>;
  try {
    parsed = JSON.parse(content) as Partial<SuggestResult>;
  } catch {
    return Response.json(
      { error: "The AI returned an unexpected format." },
      { status: 502 },
    );
  }

  const action = ACTIONS.includes(parsed.action as ActionType)
    ? (parsed.action as ActionType)
    : "unclear";

  const result: SuggestResult = {
    action,
    confidence: clampConfidence(parsed.confidence),
    rationale: String(parsed.rationale ?? "").trim(),
    learnedFrom: examples.length,
  };

  return Response.json(result);
}
