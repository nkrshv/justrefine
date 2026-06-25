import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface DevPayload {
  name?: string;
  disciplines?: string[];
  capacityPoints?: number;
  assignedPoints?: number;
  ratioPct?: number;
  ooo?: number;
  overPoints?: number;
  slackPoints?: number;
  itemCount?: number;
  soleDisciplines?: string[];
  items?: Array<{ title?: string; points?: number; discipline?: string | null }>;
}

interface HealthBody {
  pointsPerDay?: number;
  committedPoints?: number;
  capacityPoints?: number;
  teamRatioPct?: number;
  baselineStatus?: string;
  devs?: DevPayload[];
}

const STATUSES = ["sustainable", "watch", "at_risk"] as const;
type Status = (typeof STATUSES)[number];

const SYSTEM_PROMPT = `You are a caring, experienced engineering manager reviewing a sprint plan for workload health and burnout risk, on behalf of a product owner.

You are given EXACT numbers already computed by the app for each developer: their capacity in points, points currently assigned, utilisation %, days off (OOO), how much they are over or have free, how many stories they hold, and any discipline they are the ONLY person able to cover. You may ONLY reason from these numbers and the story titles provided. NEVER invent a number, name, or fact that is not given.

Judge three things together:
1. Pressure — is anyone over their own capacity (utilisation > 100%) or right at the edge? That person is likely under pressure.
2. Fairness — is the load even across people RELATIVE TO EACH PERSON'S OWN CAPACITY (so part-timers are judged fairly), or is someone carrying much more than others while someone has free room?
3. Fragility — is one person the sole owner of a discipline and also heavily loaded (a bus-factor / single point of failure)?

Tone rules:
- Frame everything as a property of the PLAN, never a criticism of the person. Say "the plan puts Chris over", not "Chris is slow".
- Be warm, concrete, and brief. Reference the actual numbers.
- If the plan is healthy, say so plainly; do not manufacture problems.

Pick an overall status:
- "at_risk": someone is over capacity, or the team is committed beyond total capacity.
- "watch": no one is over yet, but load is uneven or someone is near full (a burnout risk forming).
- "sustainable": everyone is comfortably within capacity and load is reasonably fair.

Respond ONLY with JSON in this exact shape:
{"status": "sustainable" | "watch" | "at_risk",
 "headline": string,            // one short sentence the PO reads first
 "people": [{"name": string, "status": "ok" | "stretched" | "over", "note": string}],  // one per developer, max ~16 words each
 "recommendations": [string]}   // 1-3 concrete moves to make it more sustainable; [] if already healthy`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI isn't configured yet. Add an OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: HealthBody;
  try {
    body = (await req.json()) as HealthBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const devs = Array.isArray(body.devs) ? body.devs : [];
  if (devs.length === 0) {
    return Response.json(
      { error: "Add developers to evaluate the sprint." },
      { status: 400 },
    );
  }

  const userContent = [
    `Team: committed ${body.committedPoints ?? 0} pts of ${body.capacityPoints ?? 0} pts capacity (${body.teamRatioPct ?? 0}% utilised). Deterministic baseline verdict: ${body.baselineStatus ?? "unknown"}.`,
    "Developers:",
    ...devs.map((d) => {
      const disc = (d.disciplines ?? []).join("+") || "no disciplines set";
      const sole = (d.soleDisciplines ?? []).length
        ? ` ONLY person who can do ${(d.soleDisciplines ?? []).join(", ")}.`
        : "";
      const ooo = d.ooo ? ` ${d.ooo} day(s) off this sprint.` : "";
      const titles = (d.items ?? [])
        .map((i) => `"${i.title}" (${i.points}p${i.discipline ? `, ${i.discipline}` : ""})`)
        .join(", ");
      return `- ${d.name} [${disc}]: ${d.assignedPoints ?? 0}/${d.capacityPoints ?? 0} pts = ${d.ratioPct ?? 0}% (${(d.overPoints ?? 0) > 0 ? `${d.overPoints} pts OVER` : `${d.slackPoints ?? 0} pts free`}), ${d.itemCount ?? 0} stories.${ooo}${sole} Stories: ${titles || "none"}.`;
    }),
  ].join("\n");

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

  let parsed: {
    status?: unknown;
    headline?: unknown;
    people?: Array<{ name?: unknown; status?: unknown; note?: unknown }>;
    recommendations?: unknown;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    return Response.json(
      { error: "The AI returned an unexpected format." },
      { status: 502 },
    );
  }

  const status: Status = STATUSES.includes(parsed.status as Status)
    ? (parsed.status as Status)
    : "watch";

  const people = Array.isArray(parsed.people)
    ? parsed.people
        .map((p) => {
          const ps = String(p.status ?? "").trim();
          return {
            name: String(p.name ?? "").trim(),
            status: (["ok", "stretched", "over"].includes(ps)
              ? ps
              : "ok") as "ok" | "stretched" | "over",
            note: String(p.note ?? "").trim(),
          };
        })
        .filter((p) => p.name && p.note)
    : [];

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .map((r) => String(r ?? "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return Response.json({
    status,
    headline:
      typeof parsed.headline === "string" ? parsed.headline.trim() : "",
    people,
    recommendations,
  });
}
