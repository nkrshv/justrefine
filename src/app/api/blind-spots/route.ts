import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface BlindSpotRequestBody {
  title?: string;
  details?: string;
  source?: string;
  urgency?: string;
  tags?: string[];
  deadline?: string;
  exclude?: string[];
}

interface BlindSpotQuestion {
  angle: string;
  question: string;
}

interface BlindSpotResult {
  sufficient: boolean;
  reason?: string;
  questions?: BlindSpotQuestion[];
}

const NOT_ENOUGH_MESSAGE =
  "I can't spot blind spots yet — there's not enough here to reason about. Add a line on what's being asked, who it's for, or the outcome you want, then try again.";

const SYSTEM_PROMPT = `You are a sharp product discovery facilitator helping a product owner run a refinement session.
Your job is NOT to decide anything. Your job is to surface the 1-3 most important questions the team might overlook for ONE specific request, so they think from angles they'd otherwise miss.

Draw each question from a DIFFERENT lens, choosing the lenses most relevant to this request:
user segments & edge users · whether this is the real underlying problem · success metric / definition of done · scope & non-goals · dependencies & other teams · technical or feasibility risk · security, PII & compliance · data & migration · rollout & rollback · accessibility & i18n · effort vs. value · urgency/timing justification.

Hard rules:
- Ground EVERY question in concrete specifics from the request text. Reference the actual subject. No generic, template, or filler questions.
- NEVER ask about something the description already answers.
- If you cannot ask a question that is both specific and non-obvious, return fewer questions. One excellent question beats three weak ones.
- If the request has no clear ask, problem, or goal to reason about (empty, gibberish, or too vague like "make it better"), you MUST set "sufficient" to false and do not invent questions.
- You only ever ask questions. You never assert facts or make decisions.

Respond ONLY with JSON in one of these exact shapes:
{"sufficient": false, "reason": string}  // reason: one short sentence naming what's missing
{"sufficient": true, "questions": [{"angle": string, "question": string}]}  // 1 to 3 items; angle is 1-2 words`;

function meaningfulWordCount(text: string): number {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((w) => w.length >= 2).length;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI isn't configured yet. Add an OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: BlindSpotRequestBody;
  try {
    body = (await req.json()) as BlindSpotRequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const details = (body.details ?? "").trim();
  const source = (body.source ?? "").trim();
  const urgency = (body.urgency ?? "").trim();
  const deadline = (body.deadline ?? "").trim();
  const tags = Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];
  const exclude = Array.isArray(body.exclude)
    ? body.exclude.filter(Boolean).slice(0, 6)
    : [];

  // Layer 1: deterministic pre-check — refuse thin input without an AI call.
  const combinedWords = meaningfulWordCount(`${title} ${details}`);
  if (!details && combinedWords < 4) {
    const result: BlindSpotResult = {
      sufficient: false,
      reason: NOT_ENOUGH_MESSAGE,
    };
    return Response.json(result);
  }

  const userContent = [
    `Find what the team might be missing for this request.`,
    `Title: ${title}`,
    details ? `Details: ${details}` : "",
    source ? `Source/stakeholder: ${source}` : "",
    urgency ? `Urgency: ${urgency}` : "",
    deadline ? `Deadline: ${deadline}` : "",
    tags.length ? `Tags: ${tags.join(", ")}` : "",
    exclude.length
      ? `Avoid repeating these angles already shown: ${exclude.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];

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
        temperature: exclude.length ? 0.7 : 0.5,
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

  let parsed: {
    sufficient?: boolean;
    reason?: string;
    questions?: Array<{ angle?: unknown; question?: unknown }>;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    return Response.json(
      { error: "The AI returned an unexpected format." },
      { status: 502 },
    );
  }

  // Layer 2: trust the model's self-assessment, but validate the shape.
  const questions: BlindSpotQuestion[] = Array.isArray(parsed.questions)
    ? parsed.questions
        .map((q) => ({
          angle: String(q.angle ?? "").trim(),
          question: String(q.question ?? "").trim(),
        }))
        .filter((q) => q.question.length > 0)
        .slice(0, 3)
    : [];

  if (parsed.sufficient === false || questions.length === 0) {
    const result: BlindSpotResult = {
      sufficient: false,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : NOT_ENOUGH_MESSAGE,
    };
    return Response.json(result);
  }

  const result: BlindSpotResult = { sufficient: true, questions };
  return Response.json(result);
}
