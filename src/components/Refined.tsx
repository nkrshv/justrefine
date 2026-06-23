"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/cn";
import { ACTION_META, ACTION_ORDER } from "@/lib/constants";
import {
  copyText,
  downloadFile,
  mailtoLink,
  outcomeText,
  refinementSummary,
  toCSV,
} from "@/lib/export";
import { getNextAction, userStoryText } from "@/lib/followups";
import { toast } from "@/lib/toast";
import type { ActionType, RequestItem } from "@/lib/types";
import { ActionBadge, DeadlineBadge, Priority, Tag } from "./Badge";

export function Refined({
  requests,
  onReopen,
  onDelete,
}: {
  requests: RequestItem[];
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const refined = useMemo(
    () =>
      requests
        .filter((r) => r.status === "refined")
        .sort((a, b) => (b.refinedAt ?? 0) - (a.refinedAt ?? 0)),
    [requests],
  );

  const [showSummary, setShowSummary] = useState(false);

  const counts = useMemo(() => {
    const c: Record<ActionType, number> = {
      user_story: 0,
      declined: 0,
      referred: 0,
      unclear: 0,
      done: 0,
    };
    for (const r of refined) {
      if (r.action) c[r.action] += 1;
    }
    return c;
  }, [refined]);

  const summary = useMemo(() => refinementSummary(refined), [refined]);

  async function copySummary() {
    const ok = await copyText(summary);
    toast(ok ? "Summary copied to clipboard" : "Couldn't copy", ok ? "success" : "danger");
  }

  function exportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`justrefine-outcomes-${date}.csv`, toCSV(refined), "text/csv;charset=utf-8");
    toast("CSV exported", "success");
  }

  async function copyOutcome(item: RequestItem) {
    const ok = await copyText(outcomeText(item));
    toast(ok ? "Copied" : "Couldn't copy", ok ? "success" : "danger");
  }

  if (refined.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-16 text-center text-sm text-zinc-500">
        No refined requests yet. Run a refinement session to triage your inbox.
      </p>
    );
  }

  const toolbarBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98]";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowSummary((s) => !s)}
          className={toolbarBtn}
        >
          {showSummary ? "Hide summary" : "Refinement summary"}
        </button>
        <button onClick={copySummary} className={toolbarBtn}>
          Copy summary
        </button>
        <a
          href={mailtoLink(summary.split("\n")[0], summary)}
          className={toolbarBtn}
        >
          Email summary
        </a>
        <button onClick={exportCsv} className={`${toolbarBtn} ml-auto`}>
          Export CSV
        </button>
      </div>

      {showSummary && (
        <div className="jr-fade-in mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Stakeholder summary
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700">
            {summary}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ACTION_ORDER.map((a) => (
          <div
            key={a}
            className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm"
          >
            <p className="text-2xl font-semibold text-zinc-900">{counts[a]}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500">
              <span className={`h-1.5 w-1.5 rounded-full ${ACTION_META[a].dot}`} />
              {ACTION_META[a].short}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2.5">
        {refined.map((r) => (
          <article
            key={r.id}
            className="jr-fade-in rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {r.action && <ActionBadge action={r.action} />}
                  <h3 className="break-words text-sm font-semibold text-zinc-900">
                    {r.title}
                  </h3>
                </div>
                {r.action === "referred" && r.referTo && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Referred to:{" "}
                    <span className="font-medium text-zinc-700">
                      {r.referTo}
                    </span>
                  </p>
                )}
                {(r.reason || r.outcomeNote) && (
                  <p className="mt-1 text-xs italic text-zinc-500">
                    “{r.reason || r.outcomeNote}”
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Priority urgency={r.urgency} />
                <DeadlineBadge deadline={r.deadline} />
              </div>
            </div>

            <NextActionRow item={r} />

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              {r.source && (
                <span className="font-medium text-zinc-500">{r.source}</span>
              )}
              {r.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
              <span className="ml-auto">
                {r.refinedAt ? formatDate(r.refinedAt) : ""}
              </span>
              <button
                onClick={() => copyOutcome(r)}
                className="rounded px-1.5 py-0.5 font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                Copy
              </button>
              <button
                onClick={() => onReopen(r.id)}
                className="rounded px-1.5 py-0.5 font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                Reopen
              </button>
              <button
                onClick={() => onDelete(r.id)}
                className="rounded px-1.5 py-0.5 font-medium text-zinc-300 transition hover:bg-rose-50 hover:text-rose-500"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function NextActionRow({ item }: { item: RequestItem }) {
  const next = getNextAction(item);
  if (!next) return null;
  return (
    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Next action
      </p>
      <p className="mt-1 text-sm text-zinc-700">{next.text}</p>
      {item.action === "user_story" && (
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-600">
          {userStoryText(item)}
        </pre>
      )}
      {next.mailto && (
        <a
          href={next.mailto}
          className="mt-2 inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
        >
          Open email draft
        </a>
      )}
    </div>
  );
}
