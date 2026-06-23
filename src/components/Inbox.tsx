"use client";

import { useMemo, useState } from "react";
import { cn, formatDate } from "@/lib/cn";
import { compareRequests } from "@/lib/sorting";
import type { NewRequestInput } from "@/lib/store";
import type { RequestItem, SortKey } from "@/lib/types";
import { DeadlineBadge, PriorityIcon, Tag } from "./Badge";
import { RequestForm } from "./RequestForm";

export function Inbox({
  requests,
  onAdd,
  onAddMany,
  onDelete,
  onStartRefinement,
  onSeed,
}: {
  requests: RequestItem[];
  onAdd: (input: NewRequestInput) => void;
  onAddMany: (inputs: NewRequestInput[]) => void;
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
    "rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <RequestForm onAdd={onAdd} onAddMany={onAddMany} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              Waiting to refine
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                {inbox.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {filtered.length === inbox.length
                ? "New requests land here, ready for your next refinement."
                : `${filtered.length} of ${inbox.length} shown.`}
            </p>
          </div>
          <button
            onClick={onStartRefinement}
            disabled={inbox.length === 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start refinement →
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="min-w-[140px] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
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

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
          {inbox.length === 0 ? (
            <EmptyInbox onSeed={onSeed} />
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No requests match these filters.
            </p>
          ) : (
            filtered.map((r) => (
              <article
                key={r.id}
                className="jr-fade-in group flex items-center gap-3 border-b border-zinc-100 bg-white px-3.5 py-2.5 transition last:border-b-0 hover:bg-zinc-50"
              >
                <PriorityIcon urgency={r.urgency} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-zinc-900">
                      {r.title}
                    </h3>
                  </div>
                  {r.details && (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {r.details}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.source && (
                    <span className="hidden text-xs font-medium text-zinc-400 sm:inline">
                      {r.source}
                    </span>
                  )}
                  {r.tags.slice(0, 2).map((t) => (
                    <span key={t} className="hidden sm:inline">
                      <Tag label={t} />
                    </span>
                  ))}
                  <DeadlineBadge deadline={r.deadline} />
                  <span className="hidden w-16 text-right text-xs text-zinc-400 lg:inline">
                    {formatDate(r.createdAt)}
                  </span>
                  <button
                    onClick={() => onDelete(r.id)}
                    className={cn(
                      "rounded p-1 text-zinc-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100",
                    )}
                    aria-label="Delete request"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                      <path
                        d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-zinc-700">Your inbox is empty</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">
        Add requests with the form on the left, or load a few sample requests to
        see how refinement works.
      </p>
      <button
        onClick={onSeed}
        className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
      >
        Load sample requests
      </button>
    </div>
  );
}
