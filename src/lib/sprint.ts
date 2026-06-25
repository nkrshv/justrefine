"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "justrefine:sprint:v1";

export type Discipline = "frontend" | "backend" | "devops";

export const DISCIPLINES: Discipline[] = ["frontend", "backend", "devops"];

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps",
};

export function isDiscipline(v: unknown): v is Discipline {
  return v === "frontend" || v === "backend" || v === "devops";
}

export interface Developer {
  id: string;
  name: string;
  weeklyHours: number; // contracted hours per week, e.g. 40 / 32 / 20
  focusPct: number; // % of time on sprint work (rest = meetings/support)
  ooo: number; // days off / OOO during this sprint (in working days)
  disciplines: Discipline[]; // what this person can take on (FE+BE = fullstack)
}

export interface WorkItem {
  id: string;
  title: string;
  points: number;
  assignee: string | null; // Developer id, or null when unassigned
  sourceId: string | null; // request id when imported from Refined
  discipline: Discipline | null; // required discipline, or null = any dev
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

function normalizeDisciplines(v: unknown): Discipline[] {
  // Missing field (legacy data) defaults to fullstack; an explicit empty array
  // is preserved (a dev that can only take untagged work).
  if (!Array.isArray(v)) return ["frontend", "backend"];
  return Array.from(new Set(v.filter(isDiscipline)));
}

function normalizeDeveloper(d: Partial<Developer>): Developer {
  return {
    id: d.id ?? createId(),
    name: d.name ?? "",
    weeklyHours: clampNumber(d.weeklyHours, 40),
    focusPct: clampNumber(d.focusPct, 75),
    ooo: clampNumber(d.ooo, 0),
    disciplines: normalizeDisciplines(d.disciplines),
  };
}

function normalizeItem(i: Partial<WorkItem>): WorkItem {
  return {
    id: i.id ?? createId(),
    title: i.title ?? "",
    points: clampNumber(i.points, 0),
    assignee: i.assignee ?? null,
    sourceId: i.sourceId ?? null,
    discipline: isDiscipline(i.discipline) ? i.discipline : null,
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
  const a = normalizeDeveloper({
    name: "Anna",
    weeklyHours: 40,
    focusPct: 75,
    ooo: 0,
    disciplines: ["frontend", "backend"],
  });
  const b = normalizeDeveloper({
    name: "Ben",
    weeklyHours: 32,
    focusPct: 75,
    ooo: 1,
    disciplines: ["backend"],
  });
  const c = normalizeDeveloper({
    name: "Chris",
    weeklyHours: 20,
    focusPct: 75,
    ooo: 0,
    disciplines: ["frontend"],
  });
  const item = (
    title: string,
    points: number,
    assignee: string | null,
    discipline: Discipline | null,
  ): WorkItem => ({
    id: createId(),
    title,
    points,
    assignee,
    sourceId: null,
    discipline,
  });
  const items: WorkItem[] = [
    item("Add SSO login (Google Workspace)", 8, a.id, "backend"),
    item("Fraud alert thresholds fix", 5, a.id, "backend"),
    item("DATEV export endpoint", 5, b.id, "backend"),
    item("Dark mode for mobile app", 3, b.id, "frontend"),
    item("SEPA instant transfer screen", 8, c.id, "frontend"),
    item("Audit log for admin actions", 3, null, "backend"),
    item("CI pipeline hardening", 5, null, "devops"),
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

export function devMatchesItem(dev: Developer, item: WorkItem): boolean {
  if (!item.discipline) return true; // untagged work can go to anyone
  return dev.disciplines.includes(item.discipline);
}

export interface BalanceResult {
  mode: "fill" | "rebalance";
  placed: Array<{ itemId: string; devId: string }>;
  leftover: Array<{ itemId: string; reason: string }>;
}

function fmtPts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Deterministic capacity- and discipline-aware allocator. The math here is
// fully deterministic so the result is always valid and never hallucinated;
// any AI layer only adds human-readable rationale on top.
export function computeBalance(
  config: SprintConfig,
  mode: "fill" | "rebalance",
): BalanceResult {
  const slots = config.developers.map((dev) => {
    const capacity = computeCapacity(dev, config, config.items).capacityPoints;
    const load =
      mode === "fill"
        ? config.items
            .filter((i) => i.assignee === dev.id)
            .reduce((s, i) => s + i.points, 0)
        : 0;
    return { dev, capacity, load };
  });

  const pool =
    mode === "fill"
      ? config.items.filter((i) => !i.assignee)
      : [...config.items];

  const placed: Array<{ itemId: string; devId: string }> = [];
  const leftover: Array<{ itemId: string; reason: string }> = [];
  const EPS = 1e-6;

  for (const item of pool) {
    const eligible = slots.filter((s) => devMatchesItem(s.dev, item));
    const label = item.discipline ? DISCIPLINE_LABEL[item.discipline] : null;

    if (eligible.length === 0) {
      leftover.push({
        itemId: item.id,
        reason: label
          ? `No ${label} developer on the team`
          : "No developers on the team",
      });
      continue;
    }

    // Worst-fit: give the story to the eligible dev with the most free room,
    // which spreads load and keeps people green rather than stacking one.
    const fits = eligible
      .filter((s) => s.load + item.points <= s.capacity + EPS)
      .sort((a, b) => b.capacity - b.load - (a.capacity - a.load));

    if (fits.length === 0) {
      const maxCap = Math.max(...eligible.map((s) => s.capacity));
      if (item.points > maxCap + EPS) {
        leftover.push({
          itemId: item.id,
          reason: `Too big to fit one person (${fmtPts(item.points)} pts) — consider splitting`,
        });
      } else {
        leftover.push({
          itemId: item.id,
          reason: label
            ? `No ${label} developer has free capacity`
            : "No developer has free capacity",
        });
      }
      continue;
    }

    const chosen = fits[0];
    chosen.load += item.points;
    placed.push({ itemId: item.id, devId: chosen.dev.id });
  }

  return { mode, placed, leftover };
}

function applyBalance(result: BalanceResult): void {
  const config = read();
  const placedMap = new Map(result.placed.map((p) => [p.itemId, p.devId]));
  const leftoverSet = new Set(result.leftover.map((l) => l.itemId));
  write({
    ...config,
    items: config.items.map((i) => {
      if (placedMap.has(i.id))
        return { ...i, assignee: placedMap.get(i.id) as string };
      if (leftoverSet.has(i.id)) return { ...i, assignee: null };
      return i;
    }),
  });
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
    applyBalance,
  };
}
