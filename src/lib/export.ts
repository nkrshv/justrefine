import { ACTION_META, ACTION_ORDER } from "./constants";
import { getNextAction, userStoryText } from "./followups";
import type { RequestItem } from "./types";

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function outcomeText(item: RequestItem): string {
  const meta = item.action ? ACTION_META[item.action] : null;
  const next = getNextAction(item);
  const lines = [
    `${item.title}${item.source ? ` (${item.source})` : ""}`,
    `Decision: ${meta?.short ?? "—"}`,
  ];
  if (next) lines.push(`Next action: ${next.text}`);
  if (item.action === "user_story") {
    lines.push("", userStoryText(item));
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  return `"${(value ?? "").replace(/"/g, '""')}"`;
}

export function toCSV(items: RequestItem[]): string {
  const header = [
    "Title",
    "Urgency",
    "Deadline",
    "Decision",
    "Source",
    "Referred to",
    "Reason / note",
    "Next action",
    "User story",
  ];
  const rows = items.map((it) => {
    const next = getNextAction(it);
    return [
      it.title,
      it.urgency,
      it.deadline,
      it.action ? ACTION_META[it.action].short : "",
      it.source,
      it.referTo,
      it.reason || it.outcomeNote,
      next ? next.text : "",
      it.action === "user_story" ? userStoryText(it).replace(/\s*\n\s*/g, " ") : "",
    ]
      .map((v) => csvCell(String(v)))
      .join(",");
  });
  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}

export function downloadFile(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function refinementSummary(items: RequestItem[]): string {
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const out: string[] = [];
  out.push(`Refinement summary — ${date}`);

  const counts = ACTION_ORDER.map((a) => ({
    a,
    n: items.filter((i) => i.action === a).length,
  })).filter((c) => c.n > 0);
  const countStr = counts
    .map((c) => `${c.n} ${ACTION_META[c.a].short.toLowerCase()}`)
    .join(", ");
  out.push(
    `${items.length} request${items.length === 1 ? "" : "s"} refined${
      countStr ? ` — ${countStr}` : ""
    }.`,
  );

  for (const a of ACTION_ORDER) {
    const group = items.filter((i) => i.action === a);
    if (group.length === 0) continue;
    out.push("");
    out.push(ACTION_META[a].short.toUpperCase());
    for (const it of group) {
      let line = `- ${it.title}`;
      if (it.source) line += ` (${it.source})`;
      if (a === "user_story") {
        line += ` → ${userStoryText(it).split("\n")[0]}`;
      } else {
        const next = getNextAction(it);
        if (next) line += ` → ${next.text}`;
      }
      out.push(line);
    }
  }
  return out.join("\n");
}

export function mailtoLink(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body,
  )}`;
}
