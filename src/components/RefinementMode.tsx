"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { burstConfetti } from "@/lib/confetti";
import { ACTION_META, ACTION_ORDER } from "@/lib/constants";
import { getNextAction, userStoryText } from "@/lib/followups";
import { compareRequests } from "@/lib/sorting";
import { toast } from "@/lib/toast";
import type { ActionType, RequestItem, ResolveInput } from "@/lib/types";
import { DeadlineBadge, Priority, Tag } from "./Badge";

type RefineSort = "urgency" | "deadline";

interface TriageExample {
  title: string;
  details: string;
  action: ActionType;
}

interface TriageSuggestion {
  action: ActionType;
  confidence: number;
  rationale: string;
  learnedFrom: number;
}

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
  const [leaving, setLeaving] = useState<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );

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
  const upNext = remaining.slice(1, 3);
  const skippedCount = inbox.length - remaining.length;

  const examples = useMemo<TriageExample[]>(
    () =>
      requests
        .filter((r) => r.status === "refined" && r.action !== null)
        .sort((a, b) => (b.refinedAt ?? 0) - (a.refinedAt ?? 0))
        .slice(0, 12)
        .map((r) => ({
          title: r.title,
          details: r.details,
          action: r.action as ActionType,
        })),
    [requests],
  );

  function runExit(anim: string, commit: () => void) {
    if (leaving) return;
    setLeaving(anim);
    exitTimer.current = setTimeout(() => {
      commit();
      setLeaving(null);
    }, 300);
  }

  function handleResolve(id: string, input: ResolveInput) {
    if (input.action === "done") burstConfetti();
    runExit("jr-leave-right", () => {
      onResolve(id, input);
      setResolvedCount((c) => c + 1);
    });
  }

  function handleSkip(id: string) {
    runExit("jr-leave-left", () => {
      setSkipped((prev) => new Set(prev).add(id));
    });
  }

  function handleDelete(id: string) {
    runExit("jr-leave-down", () => onDelete(id));
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

      <div className="relative mt-5">
        {upNext.map((r, i) => (
          <DeckShell key={r.id} depth={i + 1} leaving={leaving !== null} />
        ))}
        <div className={cn("relative", leaving)}>
          <RefineCard
            key={current.id}
            item={current}
            examples={examples}
            onResolve={handleResolve}
            onSkip={handleSkip}
            onDelete={handleDelete}
            onExit={onExit}
          />
        </div>
      </div>
    </div>
  );
}

function DeckShell({ depth, leaving }: { depth: number; leaving: boolean }) {
  const lift = leaving ? depth - 1 : depth;
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 h-full rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-out"
      style={{
        transform: `translateY(${lift * 16}px) scale(${1 - lift * 0.03})`,
        opacity: lift === 0 ? 0 : Math.max(0, 0.85 - (lift - 1) * 0.35),
        zIndex: -depth,
      }}
    />
  );
}

const fieldClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

function RefineCard({
  item,
  examples,
  onResolve,
  onSkip,
  onDelete,
  onExit,
}: {
  item: RequestItem;
  examples: TriageExample[];
  onResolve: (id: string, input: ResolveInput) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
  onExit: () => void;
}) {
  const [action, setAction] = useState<ActionType | null>(item.action);
  const [suggestion, setSuggestion] = useState<TriageSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [outcomeNote, setOutcomeNote] = useState(item.outcomeNote);
  const [reason, setReason] = useState(item.reason);
  const [referTo, setReferTo] = useState(item.referTo);
  const [spoc, setSpoc] = useState(item.spoc || item.source);
  const [spocEmail, setSpocEmail] = useState(item.spocEmail);
  const [storyRole, setStoryRole] = useState(item.storyRole);
  const [storyWant, setStoryWant] = useState(item.storyWant);
  const [storyBenefit, setStoryBenefit] = useState(item.storyBenefit);
  const [acceptance, setAcceptance] = useState(item.acceptance);
  const [emailDraft, setEmailDraft] = useState(item.emailDraft);
  const [drafting, setDrafting] = useState(false);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const suggestRequested = useRef(false);

  async function suggestAction() {
    setSuggesting(true);
    setSuggestDismissed(false);
    try {
      const res = await fetch("/api/suggest-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          details: item.details,
          source: item.source,
          urgency: item.urgency,
          tags: item.tags,
          examples,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as TriageSuggestion & {
        error?: string;
      };
      if (!res.ok || !data.action) {
        setSuggestion(null);
        return;
      }
      setSuggestion({
        action: data.action,
        confidence: data.confidence,
        rationale: data.rationale,
        learnedFrom: data.learnedFrom ?? 0,
      });
    } catch {
      setSuggestion(null);
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => {
    if (suggestRequested.current || item.action) return;
    suggestRequested.current = true;
    void suggestAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function draftEmailWithAI() {
    setDraftingEmail(true);
    try {
      const res = await fetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          details: item.details,
          source: item.source,
          referTo,
          spoc,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        body?: string;
      };
      if (!res.ok) {
        toast(data.error || "AI draft failed", "danger");
        return;
      }
      if (data.body) setEmailDraft(data.body);
      toast("Email drafted with AI — review and edit", "success");
    } catch {
      toast("Couldn't reach the AI service", "danger");
    } finally {
      setDraftingEmail(false);
    }
  }

  async function draftWithAI() {
    setDrafting(true);
    try {
      const res = await fetch("/api/draft-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          details: item.details,
          source: item.source,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        storyRole?: string;
        storyWant?: string;
        storyBenefit?: string;
        acceptance?: string;
      };
      if (!res.ok) {
        toast(data.error || "AI draft failed", "danger");
        return;
      }
      setAction("user_story");
      if (data.storyRole) setStoryRole(data.storyRole);
      if (data.storyWant) setStoryWant(data.storyWant);
      if (data.storyBenefit) setStoryBenefit(data.storyBenefit);
      if (data.acceptance) setAcceptance(data.acceptance);
      toast("Drafted with AI — review and edit", "success");
    } catch {
      toast("Couldn't reach the AI service", "danger");
    } finally {
      setDrafting(false);
    }
  }

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
      emailDraft: emailDraft.trim(),
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
      emailDraft,
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
    <div className="jr-card-promote relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-lg font-semibold leading-snug text-zinc-900">
          {item.title}
        </h2>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Priority urgency={item.urgency} />
          <DeadlineBadge deadline={item.deadline} />
        </div>
      </div>

      {item.details && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-600">
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

      <CopilotBanner
        suggesting={suggesting}
        suggestion={suggestion}
        dismissed={suggestDismissed}
        currentAction={action}
        onApply={(a) => {
          setAction(a);
          setSuggestDismissed(true);
        }}
        onDismiss={() => setSuggestDismissed(true)}
        onRetry={() => void suggestAction()}
      />

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
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Draft the story, or let AI start it for you.
                </span>
                <button
                  type="button"
                  onClick={draftWithAI}
                  disabled={drafting}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/[0.06] px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <path
                      d="M8 2.2 9 5.4 12.2 6.4 9 7.4 8 10.6 7 7.4 3.8 6.4 7 5.4 8 2.2ZM12.5 10.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L10.5 12.5l1.5-.5.5-1.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  {drafting ? "Drafting…" : "Draft with AI"}
                </button>
              </div>
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Handover email — write it, or let AI draft it.
                </span>
                <button
                  type="button"
                  onClick={draftEmailWithAI}
                  disabled={draftingEmail}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/[0.06] px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <path
                      d="M8 2.2 9 5.4 12.2 6.4 9 7.4 8 10.6 7 7.4 3.8 6.4 7 5.4 8 2.2ZM12.5 10.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L10.5 12.5l1.5-.5.5-1.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  {draftingEmail ? "Drafting…" : "Draft with AI"}
                </button>
              </div>
              <textarea
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="Handover email body (optional) — used by the email draft link"
                rows={4}
                className={cn(fieldClass, "resize-y")}
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
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-600">
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

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path
        d="M8 2.2 9 5.4 12.2 6.4 9 7.4 8 10.6 7 7.4 3.8 6.4 7 5.4 8 2.2ZM12.5 10.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L10.5 12.5l1.5-.5.5-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CopilotBanner({
  suggesting,
  suggestion,
  dismissed,
  currentAction,
  onApply,
  onDismiss,
  onRetry,
}: {
  suggesting: boolean;
  suggestion: TriageSuggestion | null;
  dismissed: boolean;
  currentAction: ActionType | null;
  onApply: (a: ActionType) => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (dismissed) return null;

  if (suggesting && !suggestion) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.05] px-3 py-2.5 text-xs font-medium text-accent">
        <SparkleIcon className="h-3.5 w-3.5 animate-pulse" />
        Triage Copilot is thinking…
      </div>
    );
  }

  if (!suggestion) return null;

  const meta = ACTION_META[suggestion.action];
  const applied = currentAction === suggestion.action;

  return (
    <div className="jr-fade-in mb-3 rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <SparkleIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-medium text-zinc-500">
              Triage Copilot suggests
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-900 ring-1 ring-zinc-200">
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              {meta.short}
            </span>
            <span className="text-xs font-medium text-accent">
              {suggestion.confidence}% sure
            </span>
          </div>
          {suggestion.rationale && (
            <p className="mt-1 break-words text-sm text-zinc-700">
              {suggestion.rationale}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {applied ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                  <path
                    d="m3.5 8.5 2.8 2.8L12.5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Applied
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onApply(suggestion.action)}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]"
              >
                Apply suggestion
              </button>
            )}
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-700"
            >
              Re-suggest
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white hover:text-zinc-600"
            >
              Dismiss
            </button>
            {suggestion.learnedFrom > 0 && (
              <span className="ml-auto text-[11px] text-zinc-400">
                Learned from your {suggestion.learnedFrom} past decision
                {suggestion.learnedFrom === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
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
