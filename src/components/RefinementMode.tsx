"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ACTION_META, ACTION_ORDER } from "@/lib/constants";
import { getNextAction, userStoryText } from "@/lib/followups";
import { compareRequests } from "@/lib/sorting";
import type { ActionType, RequestItem, ResolveInput } from "@/lib/types";
import { DeadlineBadge, Priority, Tag } from "./Badge";

type RefineSort = "urgency" | "deadline";

export function RefinementMode({
  requests,
  onResolve,
  onDelete,
  onExit,
}: {
  requests: RequestItem[];
  onResolve: (id: string, input: ResolveInput) => void;
  onDelete: (id: string) => void;
  onExit: () => void;
}) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [resolvedCount, setResolvedCount] = useState(0);
  const [sort, setSort] = useState<RefineSort>("urgency");

  const inbox = useMemo(
    () => requests.filter((r) => r.status === "inbox"),
    [requests],
  );

  const remaining = useMemo(
    () =>
      inbox
        .filter((r) => !skipped.has(r.id))
        .sort((a, b) => compareRequests(a, b, sort)),
    [inbox, skipped, sort],
  );

  const current = remaining[0];
  const skippedCount = inbox.length - remaining.length;

  function handleResolve(id: string, input: ResolveInput) {
    onResolve(id, input);
    setResolvedCount((c) => c + 1);
  }

  function handleSkip(id: string) {
    setSkipped((prev) => new Set(prev).add(id));
  }

  if (inbox.length === 0) {
    return (
      <CenteredCard>
        <h2 className="text-lg font-semibold text-zinc-900">
          Nothing to refine
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your inbox is empty. Capture some requests first.
        </p>
        <button
          onClick={onExit}
          className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
        >
          Back to capture
        </button>
      </CenteredCard>
    );
  }

  if (!current) {
    return (
      <CenteredCard>
        <div className="jr-pop mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none">
            <path
              d="m5 10.5 3.2 3.2L15 6.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-zinc-900">
          {resolvedCount > 0 ? "Refinement complete" : "All caught up"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {resolvedCount > 0
            ? `You triaged ${resolvedCount} ${
                resolvedCount === 1 ? "request" : "requests"
              }. See the outcomes in the Refined tab.`
            : "Nothing left in the queue right now."}
        </p>
        {skippedCount > 0 && (
          <button
            onClick={() => setSkipped(new Set())}
            className="mt-4 block w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
          >
            Bring back {skippedCount} skipped
          </button>
        )}
        <button
          onClick={onExit}
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
        >
          Go to Refined
        </button>
      </CenteredCard>
    );
  }

  const totalForBar = resolvedCount + remaining.length;
  const progress =
    totalForBar > 0 ? Math.round((resolvedCount / totalForBar) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          ← Exit
          <kbd>Esc</kbd>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-zinc-400">Sort by</span>
          <SortToggle
            active={sort === "urgency"}
            onClick={() => setSort("urgency")}
            label="Urgency"
          />
          <SortToggle
            active={sort === "deadline"}
            onClick={() => setSort("deadline")}
            label="Deadline"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {remaining.length} left
        </span>
      </div>

      <RefineCard
        key={current.id}
        item={current}
        onResolve={handleResolve}
        onSkip={handleSkip}
        onDelete={onDelete}
        onExit={onExit}
      />
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

function RefineCard({
  item,
  onResolve,
  onSkip,
  onDelete,
  onExit,
}: {
  item: RequestItem;
  onResolve: (id: string, input: ResolveInput) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
  onExit: () => void;
}) {
  const [action, setAction] = useState<ActionType | null>(item.action);
  const [outcomeNote, setOutcomeNote] = useState(item.outcomeNote);
  const [reason, setReason] = useState(item.reason);
  const [referTo, setReferTo] = useState(item.referTo);
  const [spoc, setSpoc] = useState(item.spoc || item.source);
  const [spocEmail, setSpocEmail] = useState(item.spocEmail);
  const [storyRole, setStoryRole] = useState(item.storyRole);
  const [storyWant, setStoryWant] = useState(item.storyWant);
  const [storyBenefit, setStoryBenefit] = useState(item.storyBenefit);
  const [acceptance, setAcceptance] = useState(item.acceptance);

  const input: ResolveInput = useMemo(
    () => ({
      action: action ?? "done",
      outcomeNote: outcomeNote.trim(),
      reason: reason.trim(),
      referTo: referTo.trim(),
      spoc: spoc.trim(),
      spocEmail: spocEmail.trim(),
      storyRole: storyRole.trim(),
      storyWant: storyWant.trim(),
      storyBenefit: storyBenefit.trim(),
      acceptance: acceptance.trim(),
    }),
    [
      action,
      outcomeNote,
      reason,
      referTo,
      spoc,
      spocEmail,
      storyRole,
      storyWant,
      storyBenefit,
      acceptance,
    ],
  );

  const preview = action ? getNextAction({ ...item, ...input }) : null;

  function isValid(): boolean {
    switch (action) {
      case "declined":
        return reason.trim().length > 0;
      case "referred":
        return referTo.trim().length > 0;
      case "unclear":
        return reason.trim().length > 0;
      case "user_story":
        return storyWant.trim().length > 0;
      case "done":
        return true;
      default:
        return false;
    }
  }

  const valid = isValid();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      if (e.key === "Escape") {
        if (typing) el?.blur();
        else onExit();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (action && valid) onResolve(item.id, input);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= "1" && e.key <= "5") {
        const idx = Number(e.key) - 1;
        if (idx < ACTION_ORDER.length) {
          e.preventDefault();
          setAction(ACTION_ORDER[idx]);
        }
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onSkip(item.id);
      } else if (e.key === "Delete") {
        e.preventDefault();
        onDelete(item.id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (action && valid) onResolve(item.id, input);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item.id, action, valid, input, onResolve, onExit, onSkip, onDelete]);

  return (
    <div className="jr-card-enter mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-snug text-zinc-900">
          {item.title}
        </h2>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Priority urgency={item.urgency} />
          <DeadlineBadge deadline={item.deadline} />
        </div>
      </div>

      {item.details && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">
          {item.details}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        {item.source && (
          <span className="font-medium text-zinc-500">{item.source}</span>
        )}
        {item.tags.map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>

      <hr className="my-5 border-zinc-100" />

      <p className="mb-2 text-sm font-medium text-zinc-700">
        What&apos;s the action?
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTION_ORDER.map((a, i) => {
          const meta = ACTION_META[a];
          const active = action === a;
          return (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={cn(
                "group flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]",
                active
                  ? "border-accent bg-accent/[0.06] ring-2 ring-accent/20"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  meta.dot,
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900">
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {meta.description}
                </span>
              </span>
              <kbd
                className={cn(
                  "shrink-0 transition",
                  active ? "" : "opacity-0 group-hover:opacity-100",
                )}
              >
                {i + 1}
              </kbd>
            </button>
          );
        })}
      </div>

      {action && (
        <div className="jr-fade-in mt-4 space-y-3 rounded-xl bg-zinc-50 p-4">
          {action === "user_story" && (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={storyRole}
                  onChange={(e) => setStoryRole(e.target.value)}
                  placeholder="As a… (role)"
                  className={fieldClass}
                />
                <input
                  value={storyWant}
                  onChange={(e) => setStoryWant(e.target.value)}
                  placeholder="I want… (capability)"
                  className={fieldClass}
                />
                <input
                  value={storyBenefit}
                  onChange={(e) => setStoryBenefit(e.target.value)}
                  placeholder="so that… (benefit)"
                  className={fieldClass}
                />
              </div>
              <textarea
                value={acceptance}
                onChange={(e) => setAcceptance(e.target.value)}
                placeholder="Acceptance criteria (one per line, optional)"
                rows={3}
                className={cn(fieldClass, "resize-y")}
              />
            </>
          )}

          {action === "declined" && (
            <>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this declined? (required)"
                rows={2}
                className={cn(fieldClass, "resize-y")}
              />
              <SpocFields
                spoc={spoc}
                spocEmail={spocEmail}
                setSpoc={setSpoc}
                setSpocEmail={setSpocEmail}
                label="Who to inform (SPOC)"
              />
            </>
          )}

          {action === "referred" && (
            <>
              <input
                value={referTo}
                onChange={(e) => setReferTo(e.target.value)}
                placeholder="Which team / owner? (required)"
                className={fieldClass}
              />
              <SpocFields
                spoc={spoc}
                spocEmail={spocEmail}
                setSpoc={setSpoc}
                setSpocEmail={setSpocEmail}
                label="Who to inform (SPOC)"
              />
            </>
          )}

          {action === "unclear" && (
            <>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What's unclear / what do you need? (required)"
                rows={2}
                className={cn(fieldClass, "resize-y")}
              />
              <SpocFields
                spoc={spoc}
                spocEmail={spocEmail}
                setSpoc={setSpoc}
                setSpocEmail={setSpocEmail}
                label="Who to ask"
              />
            </>
          )}

          {action === "done" && (
            <textarea
              value={outcomeNote}
              onChange={(e) => setOutcomeNote(e.target.value)}
              placeholder="Note (optional)"
              rows={2}
              className={cn(fieldClass, "resize-y")}
            />
          )}

          {preview && (
            <div className="rounded-lg border border-accent/20 bg-accent/[0.06] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Next action
              </p>
              <p className="mt-1 text-sm text-zinc-700">{preview.text}</p>
              {action === "user_story" && (
                <pre className="mt-2 whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-600">
                  {userStoryText({ ...item, ...input })}
                </pre>
              )}
              {preview.mailto && (
                <a
                  href={preview.mailto}
                  className="mt-2 inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
                >
                  Open email draft
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-rose-500"
          >
            Delete <kbd>Del</kbd>
          </button>
          <button
            onClick={() => onSkip(item.id)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            Skip <kbd>S</kbd>
          </button>
        </div>
        <button
          onClick={() => action && valid && onResolve(item.id, input)}
          disabled={!action || !valid}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save &amp; next →
          <kbd className="border-white/20 bg-white/15 text-white/90">↵</kbd>
        </button>
      </div>
    </div>
  );
}

function SpocFields({
  spoc,
  spocEmail,
  setSpoc,
  setSpocEmail,
  label,
}: {
  spoc: string;
  spocEmail: string;
  setSpoc: (v: string) => void;
  setSpocEmail: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">
        {label}
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={spoc}
          onChange={(e) => setSpoc(e.target.value)}
          placeholder="Name"
          className={fieldClass}
        />
        <input
          value={spocEmail}
          onChange={(e) => setSpocEmail(e.target.value)}
          type="email"
          placeholder="Email (for the draft)"
          className={fieldClass}
        />
      </div>
    </div>
  );
}

function SortToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-zinc-900 text-white"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
      )}
    >
      {label}
    </button>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="jr-card-enter mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      {children}
    </div>
  );
}
