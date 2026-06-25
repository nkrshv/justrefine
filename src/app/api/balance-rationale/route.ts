import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface Move {
  id?: string;
  title?: string;
  points?: number;
  discipline?: string | null;
  dev?: string;
  devDisciplines?: string[];
}

interface Leftover {
  title?: string;
  reason?: string;
}

interface RationaleBody {
  mode?: string;
  moves?: Move[];
  leftover?: Leftover[];
}

const SYSTEM_PROMPT = `You explain a sprint auto-assignment plan to a product owner.
The assignments were already decided by a deterministic capacity- and discipline-aware allocator — you do NOT change them, you only explain them.

For each move you are given: the story title, its points, its required discipline, the developer it was assigned to, and that developer's disciplines.
Write ONE short, concrete reason (max ~12 words) for each assignment, grounded in the specifics: the discipline match and/or that the developer had capacity. No filler, no generic phrases, no restating the title verbatim.

Respond ONLY with JSON in this exact shape:
{"notes": [{"id": string, "note": string}], "summary": string}
- One note per move, keyed by the move's id.
- "summary": one short sentence on the overall plan (e.g. how load was spread, any discipline constraints that shaped it).`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI isn't configured yet. Add an OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: RationaleBody;
  try {
    body = (await req.json()) as RationaleBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const moves = Array.isArray(body.moves) ? body.moves : [];
  if (moves.length === 0) {
    return Response.json({ notes: [], summary: "" });
  }

  const leftover = Array.isArray(body.leftover) ? body.leftover : [];

  const userContent = [
    `Mode: ${body.mode === "rebalance" ? "rebalanced the whole sprint" : "filled the backlog"}.`,
    "Assignments:",
    ...moves.map((m) => {
      const disc = m.discipline ? `${m.discipline} work` : "any-discipline work";
      const devDisc = (m.devDisciplines ?? []).join("+") || "no disciplines set";
      return `- id=${m.id} | "${m.title}" (${m.points} pts, ${disc}) → ${m.dev} [${devDisc}]`;
    }),
    leftover.length
      ? `Left in backlog (not assigned): ${leftover
          .map((l) => `"${l.title}" (${l.reason})`)
          .join("; ")}`
      : "",
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

  let parsed: {
    notes?: Array<{ id?: unknown; note?: unknown }>;
    summary?: unknown;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    return Response.json(
      { error: "The AI returned an unexpected format." },
      { status: 502 },
    );
  }

  const notes = Array.isArray(parsed.notes)
    ? parsed.notes
        .map((n) => ({
          id: String(n.id ?? "").trim(),
          note: String(n.note ?? "").trim(),
        }))
        .filter((n) => n.id && n.note)
    : [];

  return Response.json({
    notes,
    summary:
      typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  });
}
