"use client";

import { useSyncExternalStore } from "react";
import type { RequestItem, ResolveInput, Urgency } from "./types";

const STORAGE_KEY = "justrefine:requests:v1";
const EMPTY: RequestItem[] = [];

let store: RequestItem[] | null = null;
let storageBound = false;
const listeners = new Set<() => void>();

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(r: Partial<RequestItem>): RequestItem {
  return {
    id: r.id ?? createId(),
    title: r.title ?? "",
    details: r.details ?? "",
    source: r.source ?? "",
    urgency: r.urgency ?? "medium",
    deadline: r.deadline ?? "",
    tags: r.tags ?? [],
    status: r.status ?? "inbox",
    action: r.action ?? null,
    outcomeNote: r.outcomeNote ?? "",
    reason: r.reason ?? "",
    referTo: r.referTo ?? "",
    spoc: r.spoc ?? "",
    spocEmail: r.spocEmail ?? "",
    storyRole: r.storyRole ?? "",
    storyWant: r.storyWant ?? "",
    storyBenefit: r.storyBenefit ?? "",
    acceptance: r.acceptance ?? "",
    emailDraft: r.emailDraft ?? "",
    followUpDone: r.followUpDone ?? false,
    createdAt: r.createdAt ?? Date.now(),
    refinedAt: r.refinedAt ?? null,
  };
}

function loadRequests(): RequestItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<RequestItem>[];
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

function read(): RequestItem[] {
  if (store === null) store = loadRequests();
  return store;
}

function write(next: RequestItem[]) {
  store = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / serialization errors
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  if (!storageBound && typeof window !== "undefined") {
    storageBound = true;
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        store = loadRequests();
        listeners.forEach((l) => l());
      }
    });
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export interface NewRequestInput {
  title: string;
  details: string;
  source: string;
  urgency: Urgency;
  deadline: string;
  tags: string[];
}

function addRequest(input: NewRequestInput): void {
  const item = normalize({
    title: input.title.trim(),
    details: input.details.trim(),
    source: input.source.trim(),
    urgency: input.urgency,
    deadline: input.deadline,
    tags: input.tags,
    status: "inbox",
    createdAt: Date.now(),
  });
  write([item, ...read()]);
}

function addManyRequests(inputs: NewRequestInput[]): void {
  const base = Date.now();
  const items = inputs.map((input, i) =>
    normalize({
      title: input.title.trim(),
      details: input.details.trim(),
      source: input.source.trim(),
      urgency: input.urgency,
      deadline: input.deadline,
      tags: input.tags,
      status: "inbox",
      createdAt: base + (inputs.length - i),
    }),
  );
  write([...items, ...read()]);
}

function deleteRequest(id: string): void {
  write(read().filter((r) => r.id !== id));
}

function restoreRequest(item: RequestItem): void {
  if (read().some((r) => r.id === item.id)) return;
  write([item, ...read()]);
}

function resolve(id: string, input: ResolveInput): void {
  write(
    read().map((r) =>
      r.id === id
        ? {
            ...r,
            ...input,
            status: "refined" as const,
            refinedAt: Date.now(),
          }
        : r,
    ),
  );
}

function reopen(id: string): void {
  write(
    read().map((r) =>
      r.id === id
        ? {
            ...r,
            status: "inbox" as const,
            action: null,
            refinedAt: null,
            followUpDone: false,
          }
        : r,
    ),
  );
}

function toggleFollowUp(id: string, done?: boolean): void {
  write(
    read().map((r) =>
      r.id === id
        ? { ...r, followUpDone: done ?? !r.followUpDone }
        : r,
    ),
  );
}

function seedSamples(): void {
  write([...sampleRequests(), ...read()]);
}

function clearAll(): void {
  write([]);
}

export function useRequests() {
  const requests = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY,
  );

  return {
    requests,
    addRequest,
    addManyRequests,
    deleteRequest,
    restoreRequest,
    resolve,
    reopen,
    toggleFollowUp,
    seedSamples,
    clearAll,
  };
}

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function sampleRequests(): RequestItem[] {
  const now = Date.now();
  const base: Array<Partial<RequestItem>> = [
    {
      title: "Add SEPA instant payments to the transfer screen",
      details:
        "Compliance and several retail customers asked for instant euro transfers. Needs a check with the payments squad on rails.",
      source: "Head of Retail",
      spoc: "Anna Berg",
      spocEmail: "anna.berg@example.com",
      urgency: "high",
      deadline: isoInDays(14),
      tags: ["payments", "compliance"],
    },
    {
      title: "Dark mode for the mobile app",
      details:
        "Recurring request in app store reviews and from the design team.",
      source: "App Store reviews",
      urgency: "low",
      tags: ["mobile", "ux"],
    },
    {
      title: "Fraud alerts fire too often for business accounts",
      details:
        "Ops team is flooded with false positives since the last release. Likely a thresholds issue.",
      source: "Fraud Ops",
      spoc: "Marco Rossi",
      spocEmail: "marco.rossi@example.com",
      urgency: "critical",
      deadline: isoInDays(3),
      tags: ["fraud", "bug"],
    },
    {
      title: "Export transactions to accounting software (DATEV)",
      details: "Frequent ask from SME customers during onboarding calls.",
      source: "Sales",
      urgency: "medium",
      deadline: isoInDays(30),
      tags: ["integrations", "sme"],
    },
  ];
  return base.map((b, i) =>
    normalize({ ...b, status: "inbox", createdAt: now - i * 60000 }),
  );
}
