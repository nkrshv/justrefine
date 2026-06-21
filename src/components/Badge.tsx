import { cn, deadlineInfo } from "@/lib/cn";
import { ACTION_META, URGENCY_META } from "@/lib/constants";
import type { ActionType, Urgency } from "@/lib/types";

const DEADLINE_TONE: Record<string, string> = {
  overdue: "bg-red-100 text-red-700 ring-red-600/20",
  soon: "bg-amber-100 text-amber-700 ring-amber-600/20",
  later: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function DeadlineBadge({ deadline }: { deadline: string }) {
  const info = deadlineInfo(deadline);
  if (!info) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        DEADLINE_TONE[info.tone],
      )}
    >
      {info.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const meta = URGENCY_META[urgency];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        meta.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function ActionBadge({ action }: { action: ActionType }) {
  const meta = ACTION_META[action];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        meta.badge,
      )}
    >
      {meta.short}
    </span>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      #{label}
    </span>
  );
}
