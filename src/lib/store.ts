"use client";

import { useSyncExternalStore } from "react";
import type { ActionType, RequestItem, Urgency } from "./types";

const STORAGE_KEY = "refineflow:requests:v1";
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

function loadRequests(): RequestItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RequestItem[];
    return Array.isArray(parsed) ? parsed : [];
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
  tags: string[];
}

function addRequest(input: NewRequestInput): void {
  const item: RequestItem = {
    id: createId(),
    title: input.title.trim(),
    details: input.details.trim(),
    source: input.source.trim(),
    urgency: input.urgency,
    tags: input.tags,
    status: "inbox",
    action: null,
    outcomeNote: "",
    referTo: "",
    createdAt: Date.now(),
    refinedAt: null,
  };
  write([item, ...read()]);
}

function deleteRequest(id: string): void {
  write(read().filter((r) => r.id !== id));
}

function resolve(
  id: string,
  action: ActionType,
  outcomeNote: string,
  referTo: string,
): void {
  write(
    read().map((r) =>
      r.id === id
        ? {
            ...r,
            status: "refined" as const,
            action,
            outcomeNote,
            referTo,
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
        ? { ...r, status: "inbox" as const, action: null, refinedAt: null }
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
    deleteRequest,
    resolve,
    reopen,
    seedSamples,
    clearAll,
  };
}

function sampleRequests(): RequestItem[] {
  const now = Date.now();
  const base: Array<Omit<RequestItem, "id" | "createdAt">> = [
    {
      title: "Add SEPA instant payments to the transfer screen",
      details:
        "Compliance and several retail customers asked for instant euro transfers. Needs a check with the payments squad on rails.",
      source: "Head of Retail",
      urgency: "high",
      tags: ["payments", "compliance"],
      status: "inbox",
      action: null,
      outcomeNote: "",
      referTo: "",
      refinedAt: null,
    },
    {
      title: "Dark mode for the mobile app",
      details:
        "Recurring request in app store reviews and from the design team.",
      source: "App Store reviews",
      urgency: "low",
      tags: ["mobile", "ux"],
      status: "inbox",
      action: null,
      outcomeNote: "",
      referTo: "",
      refinedAt: null,
    },
    {
      title: "Fraud alerts fire too often for business accounts",
      details:
        "Ops team is flooded with false positives since the last release. Likely a thresholds issue.",
      source: "Fraud Ops",
      urgency: "critical",
      tags: ["fraud", "bug"],
      status: "inbox",
      action: null,
      outcomeNote: "",
      referTo: "",
      refinedAt: null,
    },
    {
      title: "Export transactions to accounting software (DATEV)",
      details: "Frequent ask from SME customers during onboarding calls.",
      source: "Sales",
      urgency: "medium",
      tags: ["integrations", "sme"],
      status: "inbox",
      action: null,
      outcomeNote: "",
      referTo: "",
      refinedAt: null,
    },
  ];
  return base.map((b, i) => ({
    ...b,
    id: createId(),
    createdAt: now - i * 60000,
  }));
}
