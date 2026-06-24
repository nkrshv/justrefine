"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  computeCapacity,
  useSprint,
  type Developer,
  type DeveloperCapacity,
  type SprintConfig,
  type WorkItem,
} from "@/lib/sprint";
import { toast } from "@/lib/toast";

const INPUT =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function barColor(ratio: number): string {
  if (ratio > 1.0001) return "bg-rose-500";
  if (ratio > 0.85) return "bg-amber-500";
  return "bg-emerald-500";
}

function statusLabel(cap: DeveloperCapacity): { text: string; cls: string } {
  if (cap.capacityPoints <= 0)
    return { text: "no capacity", cls: "text-zinc-400" };
  if (cap.ratio > 1.0001)
    return {
      text: `${fmt(cap.assignedPoints - cap.capacityPoints)} pts over`,
      cls: "text-rose-600",
    };
  if (cap.ratio > 0.85) return { text: "near full", cls: "text-amber-600" };
  return {
    text: `${fmt(cap.capacityPoints - cap.assignedPoints)} pts free`,
    cls: "text-emerald-600",
  };
}

export function SprintPlanner() {
  const {
    config,
    patchConfig,
    addDeveloper,
    updateDeveloper,
    removeDeveloper,
    addItem,
    updateItem,
    removeItem,
    assignItem,
    loadExample,
    reset,
  } = useSprint();

  const capacities = useMemo(
    () => config.developers.map((d) => computeCapacity(d, config, config.items)),
    [config],
  );

  const totals = useMemo(() => {
    const capacityPoints = capacities.reduce(
      (s, c) => s + c.capacityPoints,
      0,
    );
    const assignedPoints = config.items
      .filter((i) => i.assignee)
      .reduce((s, i) => s + i.points, 0);
    const ratio = capacityPoints > 0 ? assignedPoints / capacityPoints : 0;
    return { capacityPoints, assignedPoints, ratio };
  }, [capacities, config.items]);

  const unassigned = config.items.filter((i) => !i.assignee);

  if (config.developers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-16 text-center">
        <p className="text-2xl">🧮</p>
        <p className="mt-2 text-sm font-semibold text-zinc-800">
          Plan your sprint by real capacity
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
          Add your developers with their contract hours and time off, then drop
          in the sprint&apos;s stories. Each person gets a capacity bar so you
          can see — at a glance — who&apos;s over or under committed.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={() => addDeveloper()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98]"
          >
            Add developer
          </button>
          <button
            onClick={loadExample}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Load example team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SprintSettings
        config={config}
        onPatch={patchConfig}
        onReset={() => {
          if (window.confirm("Clear this sprint plan? This cannot be undone.")) {
            reset();
            toast("Sprint plan cleared", "danger");
          }
        }}
      />

      <TeamSummary totals={totals} pointsPerDay={config.pointsPerDay} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Developers</h2>
          <button
            onClick={() => addDeveloper()}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
          >
            + Add developer
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {capacities.map((cap) => (
            <DeveloperCard
              key={cap.dev.id}
              cap={cap}
              config={config}
              items={config.items.filter((i) => i.assignee === cap.dev.id)}
              onUpdate={(patch) => updateDeveloper(cap.dev.id, patch)}
              onRemove={() => removeDeveloper(cap.dev.id)}
              onAssign={assignItem}
              onUnassign={(itemId) => assignItem(itemId, null)}
            />
          ))}
        </div>
      </div>

      <Backlog
        items={unassigned}
        developers={config.developers}
        pointsPerDay={config.pointsPerDay}
        onAdd={addItem}
        onAssign={assignItem}
        onUpdate={updateItem}
        onRemove={removeItem}
      />
    </div>
  );
}

function SprintSettings({
  config,
  onPatch,
  onReset,
}: {
  config: SprintConfig;
  onPatch: (patch: Partial<SprintConfig>) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="flex-1 min-w-[160px]">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            Sprint
          </span>
          <input
            value={config.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="Sprint name"
            className={INPUT}
          />
        </label>
        <NumberField
          label="Working days"
          value={config.workingDays}
          min={1}
          step={1}
          onChange={(v) => onPatch({ workingDays: v })}
        />
        <NumberField
          label="Full-time h/wk"
          value={config.fullTimeHours}
          min={1}
          step={1}
          onChange={(v) => onPatch({ fullTimeHours: v })}
        />
        <NumberField
          label="Points / day"
          value={config.pointsPerDay}
          min={0.1}
          step={0.5}
          onChange={(v) => onPatch({ pointsPerDay: v })}
        />
        <button
          onClick={onReset}
          className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500"
        >
          Clear plan
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Capacity = contract hours × availability × focus, converted at{" "}
        {fmt(config.pointsPerDay)} point{config.pointsPerDay === 1 ? "" : "s"} per
        day. Adjust the ratio for how your team estimates.
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  step,
  onChange,
  width = "w-20",
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
  width?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={cn(INPUT, width, "px-2.5")}
      />
    </label>
  );
}

function TeamSummary({
  totals,
  pointsPerDay,
}: {
  totals: { capacityPoints: number; assignedPoints: number; ratio: number };
  pointsPerDay: number;
}) {
  const pct = Math.min(100, Math.round(totals.ratio * 100));
  const over = totals.assignedPoints > totals.capacityPoints + 0.0001;
  const assignedDays = pointsPerDay > 0 ? totals.assignedPoints / pointsPerDay : 0;
  const capacityDays = pointsPerDay > 0 ? totals.capacityPoints / pointsPerDay : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Team capacity</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {fmt(totals.assignedPoints)} of {fmt(totals.capacityPoints)} points
            committed · {fmt(assignedDays)} / {fmt(capacityDays)} days
          </p>
        </div>
        <span
          className={cn(
            "text-sm font-semibold",
            over ? "text-rose-600" : "text-zinc-700",
          )}
        >
          {Math.round(totals.ratio * 100)}%
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColor(totals.ratio),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <p className="mt-2 text-xs font-medium text-rose-600">
          Over capacity by {fmt(totals.assignedPoints - totals.capacityPoints)}{" "}
          points — move or drop work to fit the sprint.
        </p>
      )}
    </div>
  );
}

function DeveloperCard({
  cap,
  config,
  items,
  onUpdate,
  onRemove,
  onAssign,
  onUnassign,
}: {
  cap: DeveloperCapacity;
  config: SprintConfig;
  items: WorkItem[];
  onUpdate: (patch: Partial<Developer>) => void;
  onRemove: () => void;
  onAssign: (itemId: string, assignee: string) => void;
  onUnassign: (itemId: string) => void;
}) {
  const { dev } = cap;
  const pct = Math.min(100, Math.round(cap.ratio * 100));
  const status = statusLabel(cap);

  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <input
          value={dev.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Developer name"
          className="min-w-0 flex-1 rounded-md border border-transparent px-1.5 py-1 text-sm font-semibold text-zinc-900 transition hover:border-zinc-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
        <button
          onClick={onRemove}
          aria-label="Remove developer"
          className="shrink-0 rounded px-1.5 py-1 text-xs font-medium text-zinc-300 transition hover:bg-rose-50 hover:text-rose-500"
        >
          Remove
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
        <MiniField
          label="Hours/wk"
          value={dev.weeklyHours}
          step={1}
          min={0}
          onChange={(v) => onUpdate({ weeklyHours: v })}
        />
        <MiniField
          label="Days off"
          value={dev.ooo}
          step={0.5}
          min={0}
          onChange={(v) => onUpdate({ ooo: v })}
        />
        <MiniField
          label="Focus %"
          value={dev.focusPct}
          step={5}
          min={0}
          max={100}
          onChange={(v) => onUpdate({ focusPct: v })}
        />
        <span className="ml-auto text-[11px] text-zinc-400">
          {fmt(cap.fte)} FTE · {fmt(cap.focusDays)} focus days
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-600">
          {fmt(cap.assignedPoints)} / {fmt(cap.capacityPoints)} pts
        </span>
        <span className={cn("font-semibold", status.cls)}>{status.text}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColor(cap.ratio),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 space-y-1">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2.5 text-center text-xs text-zinc-400">
            No stories yet — assign from the backlog below.
          </p>
        ) : (
          items.map((item) => (
            <AssignedItem
              key={item.id}
              item={item}
              developers={config.developers}
              onReassign={(to) => onAssign(item.id, to)}
              onUnassign={() => onUnassign(item.id)}
            />
          ))
        )}
      </div>
    </article>
  );
}

function MiniField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-zinc-500">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-900 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
    </label>
  );
}

function AssignedItem({
  item,
  developers,
  onReassign,
  onUnassign,
}: {
  item: WorkItem;
  developers: Developer[];
  onReassign: (to: string) => void;
  onUnassign: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-2.5 py-1.5">
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
        {item.title}
      </span>
      <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
        {fmt(item.points)}
      </span>
      <select
        value={item.assignee ?? ""}
        onChange={(e) =>
          e.target.value ? onReassign(e.target.value) : onUnassign()
        }
        aria-label="Reassign story"
        className="shrink-0 rounded-md border border-transparent bg-transparent py-0.5 text-xs text-zinc-400 transition hover:text-zinc-700 focus:border-zinc-200 focus:outline-none"
      >
        {developers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name || "Unnamed"}
          </option>
        ))}
        <option value="">Unassign</option>
      </select>
    </div>
  );
}

function Backlog({
  items,
  developers,
  pointsPerDay,
  onAdd,
  onAssign,
  onUpdate,
  onRemove,
}: {
  items: WorkItem[];
  developers: Developer[];
  pointsPerDay: number;
  onAdd: (input: { title: string; points: number }) => void;
  onAssign: (itemId: string, assignee: string | null) => void;
  onUpdate: (id: string, patch: Partial<WorkItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("3");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(points);
    if (!title.trim()) return;
    onAdd({ title, points: Number.isFinite(p) ? p : 0 });
    setTitle("");
    setPoints("3");
  }

  const totalUnassigned = items.reduce((s, i) => s + i.points, 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Backlog</h2>
        <span className="text-xs text-zinc-500">
          {items.length === 0
            ? "all assigned"
            : `${items.length} unassigned · ${fmt(totalUnassigned)} pts (${fmt(
                pointsPerDay > 0 ? totalUnassigned / pointsPerDay : 0,
              )} days)`}
        </span>
      </div>

      <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Story / work item"
          className={cn(INPUT, "min-w-[180px] flex-1")}
        />
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          aria-label="Points"
          className={cn(INPUT, "w-20")}
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </form>

      <div className="mt-3 space-y-1">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400">
            Everything is assigned to a developer.
          </p>
        ) : (
          items.map((item) => (
            <BacklogRow
              key={item.id}
              item={item}
              developers={developers}
              onAssign={(to) => onAssign(item.id, to)}
              onUpdatePoints={(p) => onUpdate(item.id, { points: p })}
              onRemove={() => onRemove(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BacklogRow({
  item,
  developers,
  onAssign,
  onUpdatePoints,
  onRemove,
}: {
  item: WorkItem;
  developers: Developer[];
  onAssign: (to: string) => void;
  onUpdatePoints: (p: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-zinc-100 px-2.5 py-1.5 transition hover:border-zinc-200">
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
        {item.title}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={item.points}
        onChange={(e) => {
          const n = Number(e.target.value);
          onUpdatePoints(Number.isFinite(n) ? n : 0);
        }}
        aria-label="Points"
        className="w-14 rounded-md border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
      <select
        value=""
        onChange={(e) => e.target.value && onAssign(e.target.value)}
        aria-label="Assign to developer"
        className="shrink-0 rounded-md border border-zinc-200 bg-white py-1 pl-2 pr-1 text-xs font-medium text-zinc-600 transition hover:border-accent focus:border-accent focus:outline-none"
      >
        <option value="">Assign to…</option>
        {developers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name || "Unnamed"}
          </option>
        ))}
      </select>
      <button
        onClick={onRemove}
        aria-label="Remove story"
        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-zinc-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
