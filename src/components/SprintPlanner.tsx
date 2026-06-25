"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  computeBalance,
  computeCapacity,
  devMatchesItem,
  DISCIPLINE_LABEL,
  DISCIPLINES,
  useSprint,
  type BalanceResult,
  type Developer,
  type DeveloperCapacity,
  type Discipline,
  type SprintConfig,
  type WorkItem,
} from "@/lib/sprint";
import { useRequests } from "@/lib/store";
import { toast } from "@/lib/toast";

const INPUT =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const DRAG_MIME = "application/x-jr-item";

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function barColor(ratio: number): string {
  if (ratio > 1.0001) return "bg-rose-500";
  if (ratio > 0.85) return "bg-amber-500";
  return "bg-emerald-500";
}

function dotColor(ratio: number, hasCapacity: boolean): string {
  if (!hasCapacity) return "bg-zinc-300";
  if (ratio > 1.0001) return "bg-rose-500";
  if (ratio > 0.85) return "bg-amber-500";
  return "bg-emerald-500";
}

function statusText(cap: DeveloperCapacity): { text: string; cls: string } {
  const pct = Math.round(cap.ratio * 100);
  if (cap.capacityPoints <= 0)
    return { text: "no capacity", cls: "text-zinc-400" };
  if (cap.ratio > 1.0001)
    return {
      text: `${fmt(cap.assignedPoints - cap.capacityPoints)} pts over · ${pct}%`,
      cls: "text-rose-600",
    };
  if (cap.ratio > 0.85)
    return { text: `near full · ${pct}%`, cls: "text-amber-600" };
  return {
    text: `${fmt(cap.capacityPoints - cap.assignedPoints)} pts free · ${pct}%`,
    cls: "text-emerald-600",
  };
}

function GripIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition group-hover:text-zinc-400"
      aria-hidden
    >
      <circle cx="6" cy="4" r="1" fill="currentColor" />
      <circle cx="10" cy="4" r="1" fill="currentColor" />
      <circle cx="6" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="8" r="1" fill="currentColor" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function SprintPlanner() {
  const {
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
  } = useSprint();
  const { requests } = useRequests();

  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceMode, setBalanceMode] = useState<"fill" | "rebalance">("fill");
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [rationaleState, setRationaleState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");

  const refinedStories = useMemo(
    () =>
      requests.filter(
        (r) => r.status === "refined" && r.action === "user_story",
      ),
    [requests],
  );
  const importedSourceIds = useMemo(
    () => new Set(config.items.map((i) => i.sourceId).filter(Boolean)),
    [config.items],
  );
  const importableCount = refinedStories.filter(
    (r) => !importedSourceIds.has(r.id),
  ).length;

  const capacities = useMemo(
    () => config.developers.map((d) => computeCapacity(d, config, config.items)),
    [config],
  );

  const totals = useMemo(() => {
    const capacityPoints = capacities.reduce((s, c) => s + c.capacityPoints, 0);
    const assignedPoints = config.items
      .filter((i) => i.assignee)
      .reduce((s, i) => s + i.points, 0);
    const ratio = capacityPoints > 0 ? assignedPoints / capacityPoints : 0;
    return { capacityPoints, assignedPoints, ratio };
  }, [capacities, config.items]);

  const unassigned = config.items.filter((i) => !i.assignee);

  function handleRemoveDev(dev: Developer) {
    const snapshot = config;
    removeDeveloper(dev.id);
    toast(`Removed ${dev.name || "developer"}`, "danger", {
      label: "Undo",
      onClick: () => restore(snapshot),
    });
  }

  function handleRemoveItem(item: WorkItem) {
    const snapshot = config;
    removeItem(item.id);
    toast("Story removed", "danger", {
      label: "Undo",
      onClick: () => restore(snapshot),
    });
  }

  function handlePullRefined() {
    const n = addItemsFromSource(
      refinedStories.map((r) => ({ title: r.title, sourceId: r.id })),
    );
    toast(
      n === 0
        ? "Nothing new to import from Refined"
        : `Imported ${n} stor${n === 1 ? "y" : "ies"} from Refined`,
      n === 0 ? undefined : "success",
    );
  }

  const balancePlan = useMemo<BalanceResult | null>(
    () => (balanceOpen ? computeBalance(config, balanceMode) : null),
    [balanceOpen, balanceMode, config],
  );
  const rationaleReq = useRef(0);

  function fetchRationale(plan: BalanceResult) {
    if (plan.placed.length === 0) {
      rationaleReq.current++;
      setRationale({});
      setRationaleState("idle");
      return;
    }
    const token = ++rationaleReq.current;
    setRationale({});
    setRationaleState("loading");
    const itemById = new Map(config.items.map((i) => [i.id, i]));
    const devById = new Map(config.developers.map((d) => [d.id, d]));
    const payload = {
      mode: plan.mode,
      moves: plan.placed.map((p) => {
        const it = itemById.get(p.itemId);
        const dev = devById.get(p.devId);
        return {
          id: p.itemId,
          title: it?.title ?? "",
          points: it?.points ?? 0,
          discipline: it?.discipline ?? null,
          dev: dev?.name ?? "",
          devDisciplines: dev?.disciplines ?? [],
        };
      }),
      leftover: plan.leftover.map((l) => ({
        title: itemById.get(l.itemId)?.title ?? "",
        reason: l.reason,
      })),
    };
    fetch("/api/balance-rationale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("rationale failed");
        return (await r.json()) as {
          notes?: Array<{ id?: string; note?: string }>;
        };
      })
      .then((data) => {
        if (token !== rationaleReq.current) return;
        const map: Record<string, string> = {};
        for (const n of data.notes ?? []) {
          if (n.id && n.note) map[n.id] = String(n.note);
        }
        setRationale(map);
        setRationaleState("done");
      })
      .catch(() => {
        if (token !== rationaleReq.current) return;
        setRationale({});
        setRationaleState("error");
      });
  }

  function openBalance(m: "fill" | "rebalance") {
    setBalanceMode(m);
    setBalanceOpen(true);
    fetchRationale(computeBalance(config, m));
  }

  function changeBalanceMode(m: "fill" | "rebalance") {
    setBalanceMode(m);
    fetchRationale(computeBalance(config, m));
  }

  function closeBalance() {
    rationaleReq.current++;
    setBalanceOpen(false);
    setRationale({});
    setRationaleState("idle");
  }

  function handleApplyBalance() {
    if (!balancePlan) return;
    const snapshot = config;
    const n = balancePlan.placed.length;
    applyBalance(balancePlan);
    closeBalance();
    toast(
      n === 0
        ? "Nothing could be assigned"
        : `Auto-balanced ${n} stor${n === 1 ? "y" : "ies"}`,
      n === 0 ? undefined : "success",
      n === 0 ? undefined : { label: "Undo", onClick: () => restore(snapshot) },
    );
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => openBalance("fill")}
              disabled={config.items.length === 0}
              title={
                config.items.length === 0
                  ? "Add stories to the backlog first"
                  : "Let AI lay out the sprint within each person's capacity and discipline"
              }
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✨ Auto-balance
            </button>
            <button
              onClick={() => addDeveloper()}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
            >
              + Add developer
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-zinc-400">
          Tip: drag a story onto a developer to assign it — bars update live.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {capacities.map((cap) => (
            <DeveloperCard
              key={cap.dev.id}
              cap={cap}
              developers={config.developers}
              items={config.items.filter((i) => i.assignee === cap.dev.id)}
              onUpdate={(patch) => updateDeveloper(cap.dev.id, patch)}
              onRemove={() => handleRemoveDev(cap.dev)}
              onAssign={assignItem}
              onUnassign={(itemId) => assignItem(itemId, null)}
              onSetDiscipline={(itemId, d) =>
                updateItem(itemId, { discipline: d })
              }
            />
          ))}
        </div>
      </div>

      <Backlog
        items={unassigned}
        developers={config.developers}
        pointsPerDay={config.pointsPerDay}
        importableCount={importableCount}
        onPullRefined={handlePullRefined}
        onAdd={addItem}
        onAssign={assignItem}
        onUpdate={updateItem}
        onRemove={handleRemoveItem}
      />

      {balanceOpen && balancePlan && (
        <AutoBalanceModal
          config={config}
          plan={balancePlan}
          mode={balanceMode}
          onModeChange={changeBalanceMode}
          rationale={rationale}
          rationaleState={rationaleState}
          onApply={handleApplyBalance}
          onClose={closeBalance}
        />
      )}
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
        <label className="min-w-[160px] flex-1">
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
          title="Working days in this sprint (e.g. a 2-week sprint = 10)"
          value={config.workingDays}
          min={1}
          step={1}
          onChange={(v) => onPatch({ workingDays: v })}
        />
        <NumberField
          label="Full-time h/wk"
          title="Hours that count as one full-time week — used to derive each person's FTE"
          value={config.fullTimeHours}
          min={1}
          step={1}
          onChange={(v) => onPatch({ fullTimeHours: v })}
        />
        <NumberField
          label="Points / day"
          title="How many story points equal one focus day for your team. Set to 1 to plan in days."
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
  title,
  value,
  min,
  step,
  onChange,
  width = "w-20",
}: {
  label: string;
  title?: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
  width?: string;
}) {
  return (
    <label className="block" title={title}>
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
  const pct = Math.round(totals.ratio * 100);
  const fillPct = Math.min(100, pct);
  const over = totals.assignedPoints > totals.capacityPoints + 0.0001;
  const assignedDays =
    pointsPerDay > 0 ? totals.assignedPoints / pointsPerDay : 0;
  const capacityDays =
    pointsPerDay > 0 ? totals.capacityPoints / pointsPerDay : 0;

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
            "text-lg font-bold tabular-nums",
            over ? "text-rose-600" : "text-zinc-700",
          )}
        >
          {pct}%
        </span>
      </div>
      <div
        className={cn(
          "mt-3 h-2.5 w-full overflow-hidden rounded-full",
          over ? "bg-rose-100" : "bg-zinc-100",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColor(totals.ratio),
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      {over && (
        <p className="mt-2 text-xs font-semibold text-rose-600">
          Over capacity by {fmt(totals.assignedPoints - totals.capacityPoints)}{" "}
          points ({pct}%) — move or drop work to fit the sprint.
        </p>
      )}
    </div>
  );
}

function DeveloperCard({
  cap,
  developers,
  items,
  onUpdate,
  onRemove,
  onAssign,
  onUnassign,
  onSetDiscipline,
}: {
  cap: DeveloperCapacity;
  developers: Developer[];
  items: WorkItem[];
  onUpdate: (patch: Partial<Developer>) => void;
  onRemove: () => void;
  onAssign: (itemId: string, assignee: string) => void;
  onUnassign: (itemId: string) => void;
  onSetDiscipline: (itemId: string, d: Discipline | null) => void;
}) {
  const { dev } = cap;
  const fillPct = Math.min(100, Math.round(cap.ratio * 100));
  const status = statusText(cap);
  const [isOver, setIsOver] = useState(false);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id) onAssign(id, dev.id);
  }

  return (
    <article
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          setIsOver(true);
        }
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col rounded-xl border bg-white p-4 shadow-sm transition",
        isOver
          ? "border-accent ring-2 ring-accent/30"
          : "border-zinc-200",
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor(cap.ratio, cap.capacityPoints > 0))} />
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

      <div className="mt-2">
        <DisciplineChips
          value={dev.disciplines}
          onChange={(next) => onUpdate({ disciplines: next })}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
        <MiniField
          label="Hours/wk"
          title="Contracted hours per week (e.g. 40 = full-time, 20 = half-time)"
          value={dev.weeklyHours}
          step={1}
          min={0}
          onChange={(v) => onUpdate({ weeklyHours: v })}
        />
        <MiniField
          label="Days off"
          title="Working days this person is out during the sprint (PTO, holidays, OOO)"
          value={dev.ooo}
          step={0.5}
          min={0}
          onChange={(v) => onUpdate({ ooo: v })}
        />
        <label
          className="block"
          title="Share of time on sprint work, after meetings, ceremonies and support"
        >
          <span className="mb-0.5 block text-[11px] font-medium text-zinc-500">
            Focus {dev.focusPct}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={dev.focusPct}
            onChange={(e) => onUpdate({ focusPct: Number(e.target.value) })}
            className="h-1.5 w-28 cursor-pointer accent-accent"
            aria-label="Focus percentage"
          />
        </label>
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
      <div
        className={cn(
          "mt-1.5 h-2 w-full overflow-hidden rounded-full",
          cap.ratio > 1.0001 ? "bg-rose-100" : "bg-zinc-100",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColor(cap.ratio),
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="mt-3 space-y-1">
        {items.length === 0 ? (
          <p
            className={cn(
              "rounded-lg border border-dashed px-3 py-2.5 text-center text-xs transition",
              isOver
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-200 text-zinc-400",
            )}
          >
            {isOver ? "Drop to assign" : "Drag a story here, or use the menu below"}
          </p>
        ) : (
          items.map((item) => (
            <AssignedItem
              key={item.id}
              item={item}
              dev={dev}
              developers={developers}
              onReassign={(to) => onAssign(item.id, to)}
              onUnassign={() => onUnassign(item.id)}
              onSetDiscipline={(d) => onSetDiscipline(item.id, d)}
            />
          ))
        )}
      </div>
    </article>
  );
}

function MiniField({
  label,
  title,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  title?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block" title={title}>
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
  dev,
  developers,
  onReassign,
  onUnassign,
  onSetDiscipline,
}: {
  item: WorkItem;
  dev: Developer;
  developers: Developer[];
  onReassign: (to: string) => void;
  onUnassign: () => void;
  onSetDiscipline: (d: Discipline | null) => void;
}) {
  const mismatch = !devMatchesItem(dev, item);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group flex cursor-grab items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-2 py-1.5 active:cursor-grabbing"
    >
      <GripIcon />
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
        {item.title}
      </span>
      {mismatch && (
        <span
          title={`Outside ${dev.name || "this developer"}'s discipline (${
            item.discipline ? DISCIPLINE_LABEL[item.discipline] : ""
          })`}
          aria-label="Discipline mismatch"
          className="shrink-0 text-xs text-amber-500"
        >
          ⚠
        </span>
      )}
      <DisciplineTag value={item.discipline} onChange={onSetDiscipline} />
      <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
        {fmt(item.points)}
      </span>
      <select
        value={item.assignee ?? ""}
        onChange={(e) =>
          e.target.value ? onReassign(e.target.value) : onUnassign()
        }
        aria-label="Reassign story"
        className="shrink-0 rounded-md border border-zinc-200 bg-white py-1 pl-1.5 pr-1 text-xs font-medium text-zinc-600 transition hover:border-accent focus:border-accent focus:outline-none"
      >
        {developers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name || "Unnamed"}
          </option>
        ))}
        <option value="">↩ Backlog</option>
      </select>
    </div>
  );
}

function DisciplineChips({
  value,
  onChange,
}: {
  value: Discipline[];
  onChange: (next: Discipline[]) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      title="What this person can pick up. Auto-balance won't assign work outside it."
    >
      {DISCIPLINES.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? value.filter((x) => x !== d) : [...value, d])
            }
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium transition",
              on
                ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/30"
                : "bg-zinc-50 text-zinc-400 ring-1 ring-inset ring-zinc-200 hover:text-zinc-600",
            )}
          >
            {DISCIPLINE_LABEL[d]}
          </button>
        );
      })}
    </div>
  );
}

function DisciplineTag({
  value,
  onChange,
}: {
  value: Discipline | null;
  onChange: (v: Discipline | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value ? (e.target.value as Discipline) : null)
      }
      aria-label="Story discipline"
      title="Which discipline this story needs"
      className="shrink-0 rounded-md border border-zinc-200 bg-white py-1 pl-1.5 pr-1 text-xs font-medium text-zinc-500 transition hover:border-accent focus:border-accent focus:outline-none"
    >
      <option value="">Any</option>
      {DISCIPLINES.map((d) => (
        <option key={d} value={d}>
          {DISCIPLINE_LABEL[d]}
        </option>
      ))}
    </select>
  );
}

function Backlog({
  items,
  developers,
  pointsPerDay,
  importableCount,
  onPullRefined,
  onAdd,
  onAssign,
  onUpdate,
  onRemove,
}: {
  items: WorkItem[];
  developers: Developer[];
  pointsPerDay: number;
  importableCount: number;
  onPullRefined: () => void;
  onAdd: (input: { title: string; points: number }) => void;
  onAssign: (itemId: string, assignee: string | null) => void;
  onUpdate: (id: string, patch: Partial<WorkItem>) => void;
  onRemove: (item: WorkItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("3");
  const [isOver, setIsOver] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(points);
    if (!title.trim()) return;
    onAdd({ title, points: Number.isFinite(p) ? p : 0 });
    setTitle("");
    setPoints("3");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id) onAssign(id, null);
  }

  const totalUnassigned = items.reduce((s, i) => s + i.points, 0);

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          setIsOver(true);
        }
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm transition",
        isOver ? "border-accent ring-2 ring-accent/30" : "border-zinc-200",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Backlog</h2>
        <div className="flex items-center gap-2">
          {importableCount > 0 && (
            <button
              onClick={onPullRefined}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
            >
              ↥ Pull {importableCount} from Refined
            </button>
          )}
          <span className="text-xs text-zinc-500">
            {items.length === 0
              ? "all assigned"
              : `${items.length} unassigned · ${fmt(totalUnassigned)} pts (${fmt(
                  pointsPerDay > 0 ? totalUnassigned / pointsPerDay : 0,
                )} days)`}
          </span>
        </div>
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
          title="Story points"
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
          <p
            className={cn(
              "rounded-lg border border-dashed px-3 py-4 text-center text-xs transition",
              isOver
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-200 text-zinc-400",
            )}
          >
            {isOver
              ? "Drop to send back to the backlog"
              : "Everything is assigned to a developer."}
          </p>
        ) : (
          items.map((item) => (
            <BacklogRow
              key={item.id}
              item={item}
              developers={developers}
              onAssign={(to) => onAssign(item.id, to)}
              onUpdatePoints={(p) => onUpdate(item.id, { points: p })}
              onSetDiscipline={(d) => onUpdate(item.id, { discipline: d })}
              onRemove={() => onRemove(item)}
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
  onSetDiscipline,
  onRemove,
}: {
  item: WorkItem;
  developers: Developer[];
  onAssign: (to: string) => void;
  onUpdatePoints: (p: number) => void;
  onSetDiscipline: (d: Discipline | null) => void;
  onRemove: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group flex cursor-grab items-center gap-2 rounded-lg border border-zinc-100 px-2 py-1.5 transition hover:border-zinc-200 active:cursor-grabbing"
    >
      <GripIcon />
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
        {item.title}
      </span>
      <DisciplineTag value={item.discipline} onChange={onSetDiscipline} />
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
        title="Story points"
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

function AutoBalanceModal({
  config,
  plan,
  mode,
  onModeChange,
  rationale,
  rationaleState,
  onApply,
  onClose,
}: {
  config: SprintConfig;
  plan: BalanceResult;
  mode: "fill" | "rebalance";
  onModeChange: (m: "fill" | "rebalance") => void;
  rationale: Record<string, string>;
  rationaleState: "idle" | "loading" | "done" | "error";
  onApply: () => void;
  onClose: () => void;
}) {
  const itemById = useMemo(
    () => new Map(config.items.map((i) => [i.id, i])),
    [config.items],
  );
  const devById = useMemo(
    () => new Map(config.developers.map((d) => [d.id, d])),
    [config.developers],
  );

  const projected = config.developers.map((dev) => {
    const cap = computeCapacity(dev, config, config.items).capacityPoints;
    const base =
      mode === "fill"
        ? config.items
            .filter((i) => i.assignee === dev.id)
            .reduce((s, i) => s + i.points, 0)
        : 0;
    const placedHere = plan.placed.filter((p) => p.devId === dev.id);
    const added = placedHere.reduce(
      (s, p) => s + (itemById.get(p.itemId)?.points ?? 0),
      0,
    );
    return { dev, cap, load: base + added, addedCount: placedHere.length };
  });

  const placedCount = plan.placed.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Auto-balance sprint preview"
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              ✨ Auto-balance sprint
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Preview only — nothing changes until you apply. Keeps everyone
              within their capacity and discipline.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
          {(["fill", "rebalance"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                mode === m
                  ? "bg-accent text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
            >
              {m === "fill" ? "Fill from backlog" : "Rebalance everything"}
            </button>
          ))}
          <span className="text-[11px] text-zinc-400">
            {mode === "fill"
              ? "Only assigns unassigned stories — keeps current assignments"
              : "Clears and re-lays-out the whole sprint"}
          </span>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-5">
          <div className="space-y-2.5">
            {projected.map(({ dev, cap, load, addedCount }) => {
              const ratio = cap > 0 ? load / cap : 0;
              const fillPct = Math.min(100, Math.round(ratio * 100));
              return (
                <div key={dev.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700">
                      {dev.name || "Unnamed"}
                      {addedCount > 0 && (
                        <span className="ml-1 font-semibold text-accent">
                          +{addedCount}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        ratio > 1.0001
                          ? "font-semibold text-rose-600"
                          : "text-zinc-500",
                      )}
                    >
                      {fmt(load)} / {fmt(cap)} pts · {Math.round(ratio * 100)}%
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-1 h-1.5 w-full overflow-hidden rounded-full",
                      ratio > 1.0001 ? "bg-rose-100" : "bg-zinc-100",
                    )}
                  >
                    <div
                      className={cn("h-full rounded-full", barColor(ratio))}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Assignments ({placedCount})
              </h3>
              {rationaleState === "loading" && (
                <span className="text-[11px] text-zinc-400">
                  Writing rationale…
                </span>
              )}
            </div>
            {placedCount === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-center text-xs text-zinc-400">
                Nothing could be placed — see what&apos;s left below.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {plan.placed.map((p) => {
                  const it = itemById.get(p.itemId);
                  const dev = devById.get(p.devId);
                  const note = rationale[p.itemId];
                  return (
                    <li
                      key={p.itemId}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-zinc-700">
                          {it?.title}
                        </span>
                        {it?.discipline && (
                          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200">
                            {DISCIPLINE_LABEL[it.discipline]}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-zinc-400">→</span>
                        <span className="shrink-0 text-xs font-semibold text-accent">
                          {dev?.name || "Unnamed"}
                        </span>
                        <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                          {fmt(it?.points ?? 0)}
                        </span>
                      </div>
                      {note && (
                        <p className="mt-1 text-[11px] text-zinc-500">{note}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {plan.leftover.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                Left in backlog ({plan.leftover.length})
              </h3>
              <ul className="mt-2 space-y-1.5">
                {plan.leftover.map((l) => {
                  const it = itemById.get(l.itemId);
                  return (
                    <li
                      key={l.itemId}
                      className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate text-zinc-700">
                        {it?.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-amber-600">
                        {l.reason}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={placedCount === 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply plan
          </button>
        </div>
      </div>
    </div>
  );
}
