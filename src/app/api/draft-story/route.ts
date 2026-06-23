import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface DraftRequestBody {
  title?: string;
  details?: string;
  source?: string;
}

interface DraftResult {
  storyRole: string;
  storyWant: string;
  storyBenefit: string;
  acceptance: string;
}

const SYSTEM_PROMPT = `You are an experienced product owner. Turn a raw stakeholder request into a single, well-formed agile user story plus acceptance criteria.
The fields are assembled into the sentence: "As a {storyRole}, I want {storyWant}, so that {storyBenefit}." Phrase each field so that sentence reads naturally and grammatically.
Respond ONLY with JSON matching this exact shape: {"storyRole": string, "storyWant": string, "storyBenefit": string, "acceptance": string}.
- storyRole: the user or persona, no "As a" prefix (e.g. "retail customer").
- storyWant: phrase it to follow "I want", starting with "to" + a verb (e.g. "to export my transactions to CSV").
- storyBenefit: phrase it to follow "so that", as a clause WITHOUT a leading "to" or "so that" (e.g. "they can reconcile their accounts faster" or "money arrives in seconds").
- acceptance: 2 to 4 concise, testable acceptance criteria, one per line, with no bullet characters or numbering.
Be specific to the request. Do not invent unrelated scope.`;

function stripPrefix(value: string, prefixes: string[]): string {
  let out = value.trim();
  for (const p of prefixes) {
    if (out.toLowerCase().startsWith(p)) {
      out = out.slice(p.length).trim();
      break;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI isn't configured yet. Add an OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: DraftRequestBody;
  try {
    body = (await req.json()) as DraftRequestBody;
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

  const userContent = [
    `Request title: ${title}`,
    details ? `Details: ${details}` : "",
    source ? `Source/stakeholder: ${source}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
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

  let parsed: Partial<DraftResult>;
  try {
    parsed = JSON.parse(content) as Partial<DraftResult>;
  } catch {
    return Response.json(
      { error: "The AI returned an unexpected format." },
      { status: 502 },
    );
  }

  const result: DraftResult = {
    storyRole: stripPrefix(String(parsed.storyRole ?? ""), [
      "as an ",
      "as a ",
      "an ",
      "a ",
    ]),
    storyWant: stripPrefix(String(parsed.storyWant ?? ""), [
      "i want ",
      "want ",
    ]),
    storyBenefit: stripPrefix(String(parsed.storyBenefit ?? ""), [
      "so that ",
      "so ",
      "to ",
    ]),
    acceptance: String(parsed.acceptance ?? "").trim(),
  };

  return Response.json(result);
}
