"use client";

import { useMemo, useState } from "react";
import { cn, formatDate } from "@/lib/cn";
import { compareRequests } from "@/lib/sorting";
import type { NewRequestInput } from "@/lib/store";
import type { RequestItem, SortKey } from "@/lib/types";
import { DeadlineBadge, Tag, UrgencyBadge } from "./Badge";
import { RequestForm } from "./RequestForm";

export function Inbox({
  requests,
  onAdd,
  onDelete,
  onStartRefinement,
  onSeed,
}: {
  requests: RequestItem[];
  onAdd: (input: NewRequestInput) => void;
  onDelete: (id: string) => void;
  onStartRefinement: () => void;
  onSeed: () => void;
}) {
  const inbox = useMemo(
    () => requests.filter((r) => r.status === "inbox"),
    [requests],
  );

  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("urgency");

  const sources = useMemo(
    () =>
      Array.from(new Set(inbox.map((r) => r.source).filter(Boolean))).sort(),
    [inbox],
  );
  const tags = useMemo(
    () => Array.from(new Set(inbox.flatMap((r) => r.tags))).sort(),
    [inbox],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = inbox.filter((r) => {
      if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (tagFilter !== "all" && !r.tags.includes(tagFilter)) return false;
      if (q) {
        const hay = `${r.title} ${r.details} ${r.source} ${r.tags.join(
          " ",
        )}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => compareRequests(a, b, sort));
  }, [inbox, search, urgencyFilter, sourceFilter, tagFilter, sort]);

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <RequestForm onAdd={onAdd} />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Waiting to refine
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {inbox.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filtered.length === inbox.length
                ? "New requests land here, ready for your next refinement."
                : `${filtered.length} of ${inbox.length} shown.`}
            </p>
          </div>
          <button
            onClick={onStartRefinement}
            disabled={inbox.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start refinement →
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="min-w-[140px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All urgency</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="urgency">Sort: Urgency</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="source">Sort: Source</option>
          </select>
        </div>

        <div className="mt-4 space-y-2.5">
          {inbox.length === 0 ? (
            <EmptyInbox onSeed={onSeed} />
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No requests match these filters.
            </p>
          ) : (
            filtered.map((r) => (
              <article
                key={r.id}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {r.title}
                    </h3>
                    {r.details && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {r.details}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <UrgencyBadge urgency={r.urgency} />
                    <DeadlineBadge deadline={r.deadline} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {r.source && (
                    <span className="font-medium text-slate-500">
                      {r.source}
                    </span>
                  )}
                  {r.tags.map((t) => (
                    <Tag key={t} label={t} />
                  ))}
                  <span className="ml-auto">{formatDate(r.createdAt)}</span>
                  <button
                    onClick={() => onDelete(r.id)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500",
                    )}
                    aria-label="Delete request"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyInbox({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">Your inbox is empty</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
        Add requests with the form on the left, or load a few sample requests to
        see how refinement works.
      </p>
      <button
        onClick={onSeed}
        className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Load sample requests
      </button>
    </div>
  );
}
