"use client";

import { useMemo } from "react";
import { formatDate } from "@/lib/cn";
import { ACTION_META, ACTION_ORDER } from "@/lib/constants";
import type { ActionType, RequestItem } from "@/lib/types";
import { Tag, UrgencyBadge } from "./Badge";

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

  if (refined.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm text-slate-500">
        No refined requests yet. Run a refinement session to triage your inbox.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ACTION_ORDER.map((a) => (
          <div
            key={a}
            className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm"
          >
            <p className="text-2xl font-semibold text-slate-900">{counts[a]}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {ACTION_META[a].short}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2.5">
        {refined.map((r) => (
          <article
            key={r.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {r.action && <ActionPill action={r.action} />}
                  <h3 className="text-sm font-semibold text-slate-900">
                    {r.title}
                  </h3>
                </div>
                {r.action === "referred" && r.referTo && (
                  <p className="mt-1 text-xs text-slate-500">
                    Referred to:{" "}
                    <span className="font-medium text-slate-700">
                      {r.referTo}
                    </span>
                  </p>
                )}
                {r.outcomeNote && (
                  <p className="mt-1 text-xs italic text-slate-500">
                    “{r.outcomeNote}”
                  </p>
                )}
              </div>
              <UrgencyBadge urgency={r.urgency} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {r.source && (
                <span className="font-medium text-slate-500">{r.source}</span>
              )}
              {r.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
              <span className="ml-auto">
                {r.refinedAt ? formatDate(r.refinedAt) : ""}
              </span>
              <button
                onClick={() => onReopen(r.id)}
                className="rounded px-1.5 py-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Reopen
              </button>
              <button
                onClick={() => onDelete(r.id)}
                className="rounded px-1.5 py-0.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
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

function ActionPill({ action }: { action: ActionType }) {
  const meta = ACTION_META[action];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}
    >
      {meta.short}
    </span>
  );
}
