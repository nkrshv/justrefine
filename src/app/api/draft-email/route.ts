import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface DraftEmailBody {
  title?: string;
  details?: string;
  source?: string;
  referTo?: string;
  spoc?: string;
}

const SYSTEM_PROMPT = `You are an experienced product owner at a bank writing a short, professional internal handover email.
A stakeholder request is being referred to another team that should own it. Write the email body that informs the contact and hands the work over.
Respond ONLY with JSON matching this exact shape: {"body": string}.
- body: a concise, friendly, professional email body (no subject line). Start with a greeting and end with a sign-off line like "Best,". Use real newlines between paragraphs.
- Make clear what the request is, why it's being referred, and which team will now own it. Keep it to a few short sentences.
- Do not invent commitments, dates, or names that were not provided.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI isn't configured yet. Add an OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: DraftEmailBody;
  try {
    body = (await req.json()) as DraftEmailBody;
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
  const referTo = (body.referTo ?? "").trim();
  const spoc = (body.spoc ?? "").trim();

  const userContent = [
    `Request title: ${title}`,
    details ? `Details: ${details}` : "",
    source ? `Original requester/source: ${source}` : "",
    referTo ? `Referring to team/owner: ${referTo}` : "",
    spoc ? `Contact to address the email to (SPOC): ${spoc}` : "",
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
        temperature: 0.5,
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

  let parsed: { body?: string };
  try {
    parsed = JSON.parse(content) as { body?: string };
  } catch {
    return Response.json(
      { error: "The AI returned an unexpected format." },
      { status: 502 },
    );
  }

  return Response.json({ body: String(parsed.body ?? "").trim() });
}
