"use client";

import { useMemo, useState } from "react";
import { ACTION_META, URGENCY_ORDER } from "@/lib/constants";
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
import type { RequestItem } from "@/lib/types";
import { DeadlineBadge, Priority } from "./Badge";

function needsFollowUp(r: RequestItem): boolean {
  return r.action !== "done" && r.action !== null;
}

export function Refined({
  requests,
  onReopen,
  onDelete,
  onToggleFollowUp,
}: {
  requests: RequestItem[];
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFollowUp: (id: string, done?: boolean) => void;
}) {
  const refined = useMemo(
    () => requests.filter((r) => r.status === "refined"),
    [requests],
  );

  const open = useMemo(
    () =>
      refined
        .filter((r) => needsFollowUp(r) && !r.followUpDone)
        .sort(
          (a, b) =>
            URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
            (b.refinedAt ?? 0) - (a.refinedAt ?? 0),
        ),
    [refined],
  );

  const completed = useMemo(
    () =>
      refined
        .filter((r) => !needsFollowUp(r) || r.followUpDone)
        .sort((a, b) => (b.refinedAt ?? 0) - (a.refinedAt ?? 0)),
    [refined],
  );

  const [showSummary, setShowSummary] = useState(false);
  const [showDone, setShowDone] = useState(false);

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

  if (refined.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-16 text-center text-sm text-zinc-500">
        No refined requests yet. Run a refinement session to triage your inbox.
      </p>
    );
  }

  const doneCount = completed.length;
  const total = refined.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const toolbarBtn =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">Follow-ups</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {open.length === 0
              ? "You're all caught up — every follow-up is done."
              : `${open.length} thing${open.length === 1 ? "" : "s"} still need${
                  open.length === 1 ? "s" : ""
                } you · ${doneCount} of ${total} done`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          <button onClick={() => setShowSummary((s) => !s)} className={toolbarBtn}>
            {showSummary ? "Hide summary" : "Summary"}
          </button>
          <button onClick={copySummary} className={toolbarBtn}>
            Copy summary
          </button>
          <a href={mailtoLink(summary.split("\n")[0], summary)} className={toolbarBtn}>
            Email
          </a>
          <button onClick={exportCsv} className={toolbarBtn}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {showSummary && (
        <div className="jr-fade-in mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Stakeholder summary
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700">
            {summary}
          </pre>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {open.length === 0 ? (
          <div className="jr-fade-in rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-10 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 text-sm font-semibold text-zinc-800">
              Nothing left to do
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Every follow-up from this session is checked off.
            </p>
          </div>
        ) : (
          open.map((r) => (
            <FollowUpRow
              key={r.id}
              item={r}
              onToggle={() => onToggleFollowUp(r.id, true)}
              onReopen={() => onReopen(r.id)}
              onDelete={() => onDelete(r.id)}
            />
          ))
        )}
      </div>

      {completed.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-zinc-600"
          >
            <svg
              viewBox="0 0 12 12"
              className={`h-3 w-3 transition-transform ${showDone ? "rotate-90" : ""}`}
              aria-hidden
            >
              <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Done · {completed.length}
          </button>
          {showDone && (
            <div className="mt-2 space-y-1">
              {completed.map((r) => (
                <CompletedRow
                  key={r.id}
                  item={r}
                  onUndo={
                    r.followUpDone ? () => onToggleFollowUp(r.id, false) : null
                  }
                  onReopen={() => onReopen(r.id)}
                  onDelete={() => onDelete(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FollowUpRow({
  item,
  onToggle,
  onReopen,
  onDelete,
}: {
  item: RequestItem;
  onToggle: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const meta = item.action ? ACTION_META[item.action] : null;
  const next = getNextAction(item);
  const [showStory, setShowStory] = useState(false);

  async function copyOutcome() {
    const ok = await copyText(outcomeText(item));
    toast(ok ? "Copied" : "Couldn't copy", ok ? "success" : "danger");
  }

  async function copyStory() {
    const ok = await copyText(userStoryText(item));
    toast(ok ? "Story copied" : "Couldn't copy", ok ? "success" : "danger");
  }

  return (
    <article className="jr-fade-in group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300">
      <button
        onClick={onToggle}
        aria-label="Mark follow-up done"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300 text-transparent transition hover:border-accent hover:text-accent"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {meta && (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.short}
            </>
          )}
          {item.action === "referred" && item.referTo && (
            <span className="font-medium normal-case tracking-normal text-zinc-400">
              → {item.referTo}
            </span>
          )}
        </div>

        <h3 className="mt-1 break-words text-sm font-semibold text-zinc-900">
          {item.title}
        </h3>

        {next && (
          <p className="mt-0.5 break-words text-sm text-zinc-600">{next.text}</p>
        )}

        {item.action === "user_story" && showStory && (
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
            {userStoryText(item)}
          </pre>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {next?.mailto && (
            <a
              href={next.mailto}
              className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
            >
              Open email draft
            </a>
          )}
          {item.action === "user_story" && (
            <>
              <button
                onClick={copyStory}
                className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
              >
                Copy story
              </button>
              <button
                onClick={() => setShowStory((s) => !s)}
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                {showStory ? "Hide story" : "View story"}
              </button>
            </>
          )}
          {item.action !== "user_story" && (
            <button
              onClick={copyOutcome}
              className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              Copy
            </button>
          )}
          <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={onReopen}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              Reopen
            </button>
            <button
              onClick={onDelete}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-300 transition hover:bg-rose-50 hover:text-rose-500"
            >
              Delete
            </button>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Priority urgency={item.urgency} />
        <DeadlineBadge deadline={item.deadline} />
      </div>
    </article>
  );
}

function CompletedRow({
  item,
  onUndo,
  onReopen,
  onDelete,
}: {
  item: RequestItem;
  onUndo: (() => void) | null;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const meta = item.action ? ACTION_META[item.action] : null;
  const noAction = item.action === "done";

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-zinc-50">
      <button
        onClick={onUndo ?? undefined}
        disabled={!onUndo}
        aria-label={onUndo ? "Mark follow-up not done" : "No action needed"}
        title={noAction ? "No action needed" : "Done — click to undo"}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white transition ${
          noAction ? "bg-zinc-300" : "bg-accent hover:bg-accent-hover"
        } ${onUndo ? "cursor-pointer" : "cursor-default"}`}
      >
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {meta && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />}
        <span className="truncate text-sm text-zinc-400 line-through decoration-zinc-300">
          {item.title}
        </span>
        <span className="hidden shrink-0 text-[11px] text-zinc-400 sm:inline">
          {meta?.short}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onReopen}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          Reopen
        </button>
        <button
          onClick={onDelete}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-300 transition hover:bg-rose-50 hover:text-rose-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
