import type { ActionType, Urgency } from "./types";

export const URGENCY_ORDER: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const URGENCY_META: Record<
  Urgency,
  { label: string; badge: string; dot: string }
> = {
  critical: {
    label: "Critical",
    badge: "bg-red-100 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    badge: "bg-orange-100 text-orange-700 ring-orange-600/20",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-100 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  low: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
  },
};

export const ACTION_META: Record<
  ActionType,
  { label: string; short: string; badge: string; description: string }
> = {
  user_story: {
    label: "Convert to user story",
    short: "User story",
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
    description: "Ready to be written up and added to the backlog.",
  },
  declined: {
    label: "Decline",
    short: "Declined",
    badge: "bg-rose-100 text-rose-700 ring-rose-600/20",
    description: "Out of scope or not worth doing right now.",
  },
  referred: {
    label: "Refer to other team",
    short: "Referred",
    badge: "bg-violet-100 text-violet-700 ring-violet-600/20",
    description: "Belongs to another team or owner.",
  },
  unclear: {
    label: "Needs more info",
    short: "Unclear",
    badge: "bg-amber-100 text-amber-700 ring-amber-600/20",
    description: "Unclear — needs clarification before deciding.",
  },
  done: {
    label: "Already done / no action",
    short: "Done",
    badge: "bg-sky-100 text-sky-700 ring-sky-600/20",
    description: "Resolved already or no action required.",
  },
};

export const ACTION_ORDER: ActionType[] = [
  "user_story",
  "referred",
  "unclear",
  "declined",
  "done",
];
