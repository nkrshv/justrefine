"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { URGENCY_META } from "@/lib/constants";
import type { NewRequestInput } from "@/lib/store";
import type { Urgency } from "@/lib/types";
import { PriorityIcon } from "./Badge";

const INPUT =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const URGENCIES: Urgency[] = ["low", "medium", "high", "critical"];

function parseNotes(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*([-*•·–—]|\d+[.)])\s+/, "").trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function UrgencyPicker({
  urgency,
  setUrgency,
}: {
  urgency: Urgency;
  setUrgency: (u: Urgency) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-zinc-600">
        Urgency
      </span>
      <div className="flex flex-wrap gap-1.5">
        {URGENCIES.map((u) => {
          const active = urgency === u;
          return (
            <button
              key={u}
              type="button"
              onClick={() => setUrgency(u)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition active:scale-[0.97]",
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50",
              )}
            >
              <PriorityIcon urgency={u} />
              {URGENCY_META[u].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RequestForm({
  onAdd,
  onAddMany,
}: {
  onAdd: (input: NewRequestInput) => void;
  onAddMany: (inputs: NewRequestInput[]) => void;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [source, setSource] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [deadline, setDeadline] = useState("");
  const [tags, setTags] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkSource, setBulkSource] = useState("");
  const [bulkUrgency, setBulkUrgency] = useState<Urgency>("medium");
  const parsed = useMemo(() => parseNotes(bulkText), [bulkText]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title,
      details,
      source,
      urgency,
      deadline,
      tags: tags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    });
    setTitle("");
    setDetails("");
    setSource("");
    setUrgency("medium");
    setDeadline("");
    setTags("");
  }

  function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.length === 0) return;
    onAddMany(
      parsed.map((line) => ({
        title: line,
        details: "",
        source: bulkSource,
        urgency: bulkUrgency,
        deadline: "",
        tags: [],
      })),
    );
    setBulkText("");
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Capture a request</h2>
        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn(
              "rounded-md px-2.5 py-1 transition",
              mode === "single"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={cn(
              "rounded-md px-2.5 py-1 transition",
              mode === "bulk"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            Paste notes
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <form onSubmit={submit}>
          <p className="mt-0.5 text-xs text-zinc-500">
            Drop in a note from a meeting or a stakeholder ask. Triage it later.
          </p>

          <div className="mt-4 space-y-3">
            <input
              id="jr-capture-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the request? (e.g. Add CSV export)"
              className={INPUT}
            />

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Details / context (optional)"
              rows={2}
              className={cn(INPUT, "resize-y")}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Source / stakeholder"
                className={INPUT}
              />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags, comma separated"
                className={INPUT}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-zinc-600">
                Deadline (optional)
              </span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={INPUT}
              />
            </div>

            <UrgencyPicker urgency={urgency} setUrgency={setUrgency} />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to inbox
          </button>
        </form>
      ) : (
        <form onSubmit={submitBulk}>
          <p className="mt-0.5 text-xs text-zinc-500">
            Paste your meeting notes — one request per line. Bullets and numbers
            are stripped automatically.
          </p>

          <div className="mt-4 space-y-3">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"- Add CSV export to dashboard\n- Dark mode for mobile app\n- Faster login for SME accounts"}
              rows={7}
              className={cn(INPUT, "resize-y font-mono text-xs leading-relaxed")}
            />

            <input
              value={bulkSource}
              onChange={(e) => setBulkSource(e.target.value)}
              placeholder="Source / stakeholder for all (optional)"
              className={INPUT}
            />

            <UrgencyPicker urgency={bulkUrgency} setUrgency={setBulkUrgency} />
          </div>

          <button
            type="submit"
            disabled={parsed.length === 0}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {parsed.length === 0
              ? "Add to inbox"
              : `Add ${parsed.length} request${parsed.length === 1 ? "" : "s"}`}
          </button>
        </form>
      )}
    </div>
  );
}
