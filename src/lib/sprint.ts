"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "justrefine:sprint:v1";

export interface Developer {
  id: string;
  name: string;
  weeklyHours: number; // contracted hours per week, e.g. 40 / 32 / 20
  focusPct: number; // % of time on sprint work (rest = meetings/support)
  ooo: number; // days off / OOO during this sprint (in working days)
}

export interface WorkItem {
  id: string;
  title: string;
  points: number;
  assignee: string | null; // Developer id, or null when unassigned
  sourceId: string | null; // request id when imported from Refined
}

export interface SprintConfig {
  name: string;
  workingDays: number; // working days in the sprint
  fullTimeHours: number; // hours that count as one full-time week
  pointsPerDay: number; // conversion: how many points equal one focus day
  developers: Developer[];
  items: WorkItem[];
}

export interface DeveloperCapacity {
  dev: Developer;
  fte: number; // weeklyHours / fullTimeHours
  grossDays: number; // working days available before focus factor
  availableDays: number; // gross minus OOO
  focusDays: number; // available x focus factor
  capacityPoints: number; // focusDays x pointsPerDay
  assignedPoints: number;
  assignedDays: number;
  ratio: number; // assigned / capacity (0 when capacity is 0)
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultConfig(): SprintConfig {
  return {
    name: "Next sprint",
    workingDays: 10,
    fullTimeHours: 40,
    pointsPerDay: 2,
    developers: [],
    items: [],
  };
}

function clampNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDeveloper(d: Partial<Developer>): Developer {
  return {
    id: d.id ?? createId(),
    name: d.name ?? "",
    weeklyHours: clampNumber(d.weeklyHours, 40),
    focusPct: clampNumber(d.focusPct, 75),
    ooo: clampNumber(d.ooo, 0),
  };
}

function normalizeItem(i: Partial<WorkItem>): WorkItem {
  return {
    id: i.id ?? createId(),
    title: i.title ?? "",
    points: clampNumber(i.points, 0),
    assignee: i.assignee ?? null,
    sourceId: i.sourceId ?? null,
  };
}

function normalize(raw: Partial<SprintConfig> | null): SprintConfig {
  const base = defaultConfig();
  if (!raw) return base;
  return {
    name: raw.name ?? base.name,
    workingDays: clampNumber(raw.workingDays, base.workingDays),
    fullTimeHours: clampNumber(raw.fullTimeHours, base.fullTimeHours),
    pointsPerDay: clampNumber(raw.pointsPerDay, base.pointsPerDay),
    developers: Array.isArray(raw.developers)
      ? raw.developers.map(normalizeDeveloper)
      : [],
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
  };
}

let store: SprintConfig | null = null;
let storageBound = false;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = defaultConfig();

function load(): SprintConfig {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    return normalize(JSON.parse(raw) as Partial<SprintConfig>);
  } catch {
    return defaultConfig();
  }
}

function read(): SprintConfig {
  if (store === null) store = load();
  return store;
}

function write(next: SprintConfig) {
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
        store = load();
        listeners.forEach((l) => l());
      }
    });
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function patchConfig(patch: Partial<SprintConfig>): void {
  write({ ...read(), ...patch });
}

function addDeveloper(input?: Partial<Developer>): void {
  const config = read();
  const dev = normalizeDeveloper({
    name: input?.name ?? "",
    weeklyHours: input?.weeklyHours ?? config.fullTimeHours,
    focusPct: input?.focusPct ?? 75,
    ooo: input?.ooo ?? 0,
  });
  write({ ...config, developers: [...config.developers, dev] });
}

function updateDeveloper(id: string, patch: Partial<Developer>): void {
  const config = read();
  write({
    ...config,
    developers: config.developers.map((d) =>
      d.id === id ? { ...d, ...patch } : d,
    ),
  });
}

function removeDeveloper(id: string): void {
  const config = read();
  write({
    ...config,
    developers: config.developers.filter((d) => d.id !== id),
    items: config.items.map((i) =>
      i.assignee === id ? { ...i, assignee: null } : i,
    ),
  });
}

function addItem(input: { title: string; points: number }): void {
  const config = read();
  const item = normalizeItem({
    title: input.title.trim(),
    points: input.points,
    assignee: null,
  });
  if (!item.title) return;
  write({ ...config, items: [...config.items, item] });
}

function addItemsFromSource(
  inputs: Array<{ title: string; sourceId: string; points?: number }>,
): number {
  const config = read();
  const seen = new Set(
    config.items.map((i) => i.sourceId).filter((s): s is string => !!s),
  );
  const fresh = inputs.filter((i) => !seen.has(i.sourceId));
  if (fresh.length === 0) return 0;
  const items = fresh.map((i) =>
    normalizeItem({
      title: i.title.trim(),
      points: i.points ?? 3,
      sourceId: i.sourceId,
      assignee: null,
    }),
  );
  write({ ...config, items: [...config.items, ...items] });
  return items.length;
}

function updateItem(id: string, patch: Partial<WorkItem>): void {
  const config = read();
  write({
    ...config,
    items: config.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  });
}

function removeItem(id: string): void {
  const config = read();
  write({ ...config, items: config.items.filter((i) => i.id !== id) });
}

function assignItem(itemId: string, assignee: string | null): void {
  updateItem(itemId, { assignee });
}

function loadExample(): void {
  const a = normalizeDeveloper({ name: "Anna", weeklyHours: 40, focusPct: 75, ooo: 0 });
  const b = normalizeDeveloper({ name: "Ben", weeklyHours: 32, focusPct: 75, ooo: 1 });
  const c = normalizeDeveloper({ name: "Chris", weeklyHours: 20, focusPct: 75, ooo: 0 });
  const item = (title: string, points: number, assignee: string | null): WorkItem => ({
    id: createId(),
    title,
    points,
    assignee,
    sourceId: null,
  });
  const items: WorkItem[] = [
    item("Add SSO login (Google Workspace)", 8, a.id),
    item("Fraud alert thresholds fix", 5, a.id),
    item("DATEV export endpoint", 5, b.id),
    item("Dark mode for mobile app", 3, b.id),
    item("SEPA instant transfer screen", 8, c.id),
    item("Audit log for admin actions", 3, null),
  ];
  write({
    name: "Sprint 24",
    workingDays: 10,
    fullTimeHours: 40,
    pointsPerDay: 2,
    developers: [a, b, c],
    items,
  });
}

function reset(): void {
  write(defaultConfig());
}

function restore(config: SprintConfig): void {
  write(normalize(config));
}

export function computeCapacity(
  dev: Developer,
  config: SprintConfig,
  items: WorkItem[],
): DeveloperCapacity {
  const fullTime = config.fullTimeHours > 0 ? config.fullTimeHours : 40;
  const fte = dev.weeklyHours / fullTime;
  const grossDays = config.workingDays * fte;
  const availableDays = Math.max(0, grossDays - dev.ooo);
  const focusDays = availableDays * (dev.focusPct / 100);
  const capacityPoints = focusDays * config.pointsPerDay;
  const assignedPoints = items
    .filter((i) => i.assignee === dev.id)
    .reduce((sum, i) => sum + i.points, 0);
  const assignedDays =
    config.pointsPerDay > 0 ? assignedPoints / config.pointsPerDay : 0;
  const ratio = capacityPoints > 0 ? assignedPoints / capacityPoints : 0;
  return {
    dev,
    fte,
    grossDays,
    availableDays,
    focusDays,
    capacityPoints,
    assignedPoints,
    assignedDays,
    ratio,
  };
}

export function useSprint() {
  const config = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
  return {
    config,
    patchConfig,
    addDeveloper,
    updateDeveloper,
    removeDeveloper,
    addItem,
    addItemsFromSource,
    updateItem,
    removeItem,
    assignItem,
    loadExample,
    reset,
    restore,
  };
}
