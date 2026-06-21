"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { URGENCY_META } from "@/lib/constants";
import type { NewRequestInput } from "@/lib/store";
import type { Urgency } from "@/lib/types";

const URGENCIES: Urgency[] = ["low", "medium", "high", "critical"];

export function RequestForm({
  onAdd,
}: {
  onAdd: (input: NewRequestInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [source, setSource] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [tags, setTags] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title,
      details,
      source,
      urgency,
      tags: tags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    });
    setTitle("");
    setDetails("");
    setSource("");
    setUrgency("medium");
    setTags("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-900">Capture a request</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Drop in a note from a meeting or a stakeholder ask. Triage it later.
      </p>

      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the request? (e.g. Add CSV export)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Details / context (optional)"
          rows={2}
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source / stakeholder"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, comma separated"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Urgency
          </span>
          <div className="flex flex-wrap gap-2">
            {URGENCIES.map((u) => {
              const active = urgency === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
                    active
                      ? URGENCY_META[u].badge
                      : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", URGENCY_META[u].dot)}
                  />
                  {URGENCY_META[u].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!title.trim()}
        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add to inbox
      </button>
    </form>
  );
}
