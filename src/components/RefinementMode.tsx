"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ACTION_META, ACTION_ORDER, URGENCY_ORDER } from "@/lib/constants";
import type { ActionType, RequestItem } from "@/lib/types";
import { Tag, UrgencyBadge } from "./Badge";

export function RefinementMode({
  requests,
  onResolve,
  onExit,
}: {
  requests: RequestItem[];
  onResolve: (
    id: string,
    action: ActionType,
    note: string,
    referTo: string,
  ) => void;
  onExit: () => void;
}) {
  const queue = useMemo(
    () =>
      requests
        .filter((r) => r.status === "inbox")
        .sort(
          (a, b) =>
            URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
            b.createdAt - a.createdAt,
        )
        .map((r) => r.id),
    // capture once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [index, setIndex] = useState(0);
  const [action, setAction] = useState<ActionType | null>(null);
  const [note, setNote] = useState("");
  const [referTo, setReferTo] = useState("");

  const total = queue.length;
  const currentId = queue[index];
  const current = requests.find((r) => r.id === currentId);
  const done = index >= total;

  function reset() {
    setAction(null);
    setNote("");
    setReferTo("");
  }

  function commit() {
    if (!current || !action) return;
    onResolve(current.id, action, note.trim(), referTo.trim());
    reset();
    setIndex((i) => i + 1);
  }

  function skip() {
    reset();
    setIndex((i) => i + 1);
  }

  if (total === 0) {
    return (
      <CenteredCard>
        <h2 className="text-lg font-semibold text-slate-900">
          Nothing to refine
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Your inbox is empty. Capture some requests first.
        </p>
        <button
          onClick={onExit}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Back to inbox
        </button>
      </CenteredCard>
    );
  }

  if (done || !current) {
    return (
      <CenteredCard>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Refinement complete
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          You triaged {total} {total === 1 ? "request" : "requests"}. See the
          outcomes in the Refined tab.
        </p>
        <button
          onClick={onExit}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Done
        </button>
      </CenteredCard>
    );
  }

  const progress = Math.round((index / total) * 100);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onExit}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Exit
        </button>
        <span className="text-xs font-medium text-slate-500">
          {index + 1} of {total}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-slate-900">
            {current.title}
          </h2>
          <UrgencyBadge urgency={current.urgency} />
        </div>

        {current.details && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
            {current.details}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {current.source && (
            <span className="font-medium text-slate-500">{current.source}</span>
          )}
          {current.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>

        <hr className="my-5 border-slate-100" />

        <p className="mb-2 text-sm font-medium text-slate-700">
          What&apos;s the action?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACTION_ORDER.map((a) => {
            const meta = ACTION_META[a];
            const active = action === a;
            return (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  active
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>

        {action === "referred" && (
          <input
            value={referTo}
            onChange={(e) => setReferTo(e.target.value)}
            placeholder="Which team / owner?"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Decision note / outcome (optional)"
          rows={2}
          className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={skip}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Skip for now
          </button>
          <button
            onClick={commit}
            disabled={!action}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save &amp; next →
          </button>
        </div>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {children}
    </div>
  );
}
