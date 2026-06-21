import { cn, deadlineInfo } from "@/lib/cn";
import { ACTION_META, URGENCY_META } from "@/lib/constants";
import type { ActionType, Urgency } from "@/lib/types";

const LEVEL: Record<Urgency, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function PriorityIcon({
  urgency,
  className,
}: {
  urgency: Urgency;
  className?: string;
}) {
  if (urgency === "critical") {
    return (
      <span
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-orange-500 text-[10px] font-bold leading-none text-white",
          className,
        )}
        title="Critical"
      >
        !
      </span>
    );
  }
  const level = LEVEL[urgency];
  const heights = [5, 8, 11];
  return (
    <svg
      viewBox="0 0 14 14"
      className={cn("h-4 w-4", className)}
      aria-label={URGENCY_META[urgency].label}
    >
      {heights.map((h, i) => (
        <rect
          key={i}
          x={1 + i * 4.5}
          y={13 - h}
          width={3}
          height={h}
          rx={1}
          className={i < level ? "fill-zinc-600" : "fill-zinc-300"}
        />
      ))}
    </svg>
  );
}

export function Priority({ urgency }: { urgency: Urgency }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <PriorityIcon urgency={urgency} />
      {URGENCY_META[urgency].label}
    </span>
  );
}

export function DeadlineBadge({ deadline }: { deadline: string }) {
  const info = deadlineInfo(deadline);
  if (!info) return null;
  const tone =
    info.tone === "overdue"
      ? "text-rose-600"
      : info.tone === "soon"
        ? "text-amber-600"
        : "text-zinc-400";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
        <rect
          x="2"
          y="3"
          width="12"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 1.5v2M11 1.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {info.label}
    </span>
  );
}

export function ActionBadge({ action }: { action: ActionType }) {
  const meta = ACTION_META[action];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        meta.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.short}
    </span>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-500">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
      {label}
    </span>
  );
}
